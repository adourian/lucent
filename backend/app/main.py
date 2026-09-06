import os
import redis
import json
import httpx
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from fastapi import FastAPI, Query, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse
import yfinance as yf
from typing import Literal, Optional, Union
from pydantic import AwareDatetime, BaseModel

from app.core.eligibility import AbstentionResponse, assess_prediction_eligibility
from app.services.clinicaltrials_api import fetch_nctid_data_async
from app.core.predict import TrialPredictor
from app.core.prediction_identity import (
    PREDICTION_CACHE_TTL_SECONDS,
    PREDICTION_SAMPLES,
    payload_hash,
    prediction_cache_key,
)
from app.services.analytics import (
    UsageEvent,
    is_monitor_request,
    read_usage_summary,
    request_nctid,
    schedule_request_counter,
    schedule_usage_event,
)


# --- Response Models ---

class PredictionResponse(BaseModel):
    nctid: str
    phase: str
    sponsor: str
    title: str
    status: str
    diseases: str
    enrollment: Union[int, str]
    completion_date: str
    probability: float
    uncertainty: float
    deterministic: float
    label: int
    generated_at: AwareDatetime
    source_fetched_at: AwareDatetime
    source_last_updated: Optional[str] = None
    cache_hit: bool
    model_id: str
    preprocessing_id: str
    encoder_id: str
    artifact_id: str
    source_hash: str
    input_status: Literal["supported", "supported_with_missing"]
    missing_fields: list[str]


class PricePoint(BaseModel):
    date: str
    close: float


class FinanceMetadata(BaseModel):
    marketCap: Optional[int] = None
    enterpriseValue: Optional[int] = None
    trailingPE: Optional[float] = None
    forwardPE: Optional[float] = None
    pegRatio: Optional[float] = None
    priceToBook: Optional[float] = None
    beta: Optional[float] = None
    dividendYield: Optional[float] = None
    returnOnEquity: Optional[float] = None
    revenueGrowth: Optional[float] = None
    grossMargins: Optional[float] = None
    operatingMargins: Optional[float] = None
    profitMargins: Optional[float] = None
    totalRevenue: Optional[int] = None
    ebitda: Optional[int] = None
    totalDebt: Optional[int] = None
    currentRatio: Optional[float] = None
    quickRatio: Optional[float] = None
    sector: Optional[str] = None
    industry: Optional[str] = None
    summary: Optional[str] = None
    fiftyTwoWeekHigh: Optional[float] = None
    fiftyTwoWeekLow: Optional[float] = None


class FinanceResponse(BaseModel):
    ticker: str
    range: str
    interval: str
    prices: list[PricePoint]
    metadata: FinanceMetadata

# --- ------------------- ---

app_state: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    app_state["predictor"] = TrialPredictor(model_path="app/models/model_weights.pth")
    app_state["http_client"] = httpx.AsyncClient(
        timeout=httpx.Timeout(10.0),
        limits=httpx.Limits(max_keepalive_connections=5, max_connections=10)
    )
    yield
    await app_state["http_client"].aclose()


app = FastAPI(
    title="Lucent",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)


# --- REDIS CONNECTION BLOCK ---
REDIS_URL = os.getenv("REDIS_URL")
redis_client = None

if REDIS_URL:
    print(f"Connecting to Redis at {REDIS_URL}...")
    try:
        # decode_responses=True makes it return strings, not bytes. Much easier.
        redis_client = redis.from_url(REDIS_URL, decode_responses=True)
        redis_client.ping()
        print("Redis connection successful.")
    except Exception as e:
        print(f"Warning: Could not connect to Redis: {e}")
        redis_client = None
else:
    print("REDIS_URL not set. Caching is disabled.")
# --- ---------------------- ---

# Environment-based CORS configuration
ENV = os.getenv("ENV", "development")

if ENV == "production" or ENV == "dev":    ## Hosted instances
    cors_origins_env = os.getenv("CORS_ORIGINS", "")
    allowed_origins = [origin.strip() for origin in cors_origins_env.split(',') if origin.strip()]
        
else:
    # Development - allow localhost
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:5173",  # Vite dev server
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]

print(f"Running in {ENV} mode with CORS origins: {allowed_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.middleware("http")
async def track_prediction_requests(request: Request, call_next):
    """Count API requests without putting Redis on the response path.

    Uptime probes are counted separately so they cannot inflate product usage.
    The middleware intentionally ignores finance, health, docs, and static
    requests; those are operational traffic rather than analysis usage.
    """

    response = await call_next(request)
    if request.url.path.startswith("/predict/"):
        # Browser/proxy caches must not bypass the current-record check.
        response.headers["Cache-Control"] = "no-store"
        monitor = is_monitor_request(request, request_nctid(request))
        schedule_request_counter(
            redis_client,
            ENV,
            monitor=monitor,
            status_code=response.status_code,
        )
    return response

@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/events", status_code=202)
async def record_usage_event(event: UsageEvent):
    """Accept a constrained browser event and enqueue it for Redis storage.

    The endpoint never receives or stores an IP address. If Redis is not
    available, the event is simply dropped and the application remains usable.
    """

    schedule_usage_event(redis_client, ENV, event)
    return {"accepted": redis_client is not None}


@app.get("/analytics/summary")
async def analytics_summary(
    request: Request,
    date: Optional[str] = Query(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
):
    """Read daily usage counters for the owner, never for the public client."""

    admin_token = os.getenv("ANALYTICS_ADMIN_TOKEN", "").strip()
    provided_token = request.headers.get("x-analytics-admin-token", "")
    if not admin_token or not provided_token:
        raise HTTPException(status_code=404, detail="Not found")

    import secrets

    if not secrets.compare_digest(provided_token, admin_token):
        raise HTTPException(status_code=404, detail="Not found")

    requested_date = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return await read_usage_summary(redis_client, ENV, requested_date)


@app.get("/predict/{nctid}", response_model=PredictionResponse, responses={
    422: {"model": AbstentionResponse, "description": "Unsupported or insufficient input"},
    502: {"description": "Unavailable or malformed registry response"},
})
@app.head("/predict/{nctid}", include_in_schema=False)
async def predict_trial(nctid: str):

    nctid = nctid.strip().upper()

    if not nctid.startswith("NCT"):
        raise HTTPException(status_code=400, detail="Invalid NCT ID format. Must start with 'NCT'.")

    try:
        # Check current evidence before looking up a prediction. Hash the full
        # payload so registry context displayed with a prediction stays current.
        try:
            trial_data = await fetch_nctid_data_async(nctid, app_state["http_client"])
        except (json.JSONDecodeError, UnicodeDecodeError):
            trial_data = None  # The central gate reports malformed upstream JSON.
        source_fetched_at = datetime.now(timezone.utc)
        eligibility = assess_prediction_eligibility(trial_data, nctid)
        if not eligibility.eligible:
            return JSONResponse(
                status_code=502 if eligibility.status == "malformed_upstream" else 422,
                content=eligibility.abstention().model_dump(),
            )
        prepped = eligibility.prepared_trial
        source_hash = payload_hash(trial_data)
        identity = app_state["predictor"].identity
        cache_key = prediction_cache_key(ENV, nctid, identity["artifact_id"], source_hash)
        if redis_client:
            try:
                cached_json = await run_in_threadpool(redis_client.get, cache_key)
                if cached_json:
                    cached = PredictionResponse.model_validate_json(cached_json).model_dump(mode="json")
                    expected = {"nctid": nctid, "source_hash": source_hash, **identity}
                    if all(cached[key] == value for key, value in expected.items()):
                        print(f"[Cache] HIT for {nctid}")
                        return {**cached, "cache_hit": True}
            except Exception as e:
                print(f"Prediction cache read error: {e}")

        result = await run_in_threadpool(
            app_state["predictor"].predict_with_uncertainty,
            prepped,
            n_samples=PREDICTION_SAMPLES
        )

        print(f"[Lucent] {nctid} | Deterministic: {result['deterministic']} | MC: {result['probability']} ± {result['uncertainty']}")

        final_response = PredictionResponse(**{
            "nctid": nctid,
            "phase": prepped["phase"],
            "sponsor": prepped["sponsor"],
            "title": prepped.get("title", ""),
            "status": prepped.get("status", ""),
            "diseases": prepped.get("diseases", ""),
            "enrollment": prepped.get("enrollment", ""),
            "completion_date": prepped.get("completion_date", ""),
            "generated_at": datetime.now(timezone.utc),
            "source_fetched_at": source_fetched_at,
            "source_last_updated": prepped.get("source_last_updated"),
            "cache_hit": False,
            "source_hash": source_hash,
            "input_status": eligibility.status,
            "missing_fields": eligibility.missing_fields,
            **identity,
            **result
        }).model_dump(mode="json")

        # --- CACHE SET ---
        if redis_client:
            try:
                # Store the final response as a JSON string
                await run_in_threadpool(
                    redis_client.set,
                    cache_key, 
                    json.dumps(final_response),
                    ex=PREDICTION_CACHE_TTL_SECONDS,
                )
                print(f"[Cache] SET for {nctid} in {ENV}. TTL: {PREDICTION_CACHE_TTL_SECONDS}s.")
            except Exception as e:
                print(f"Redis 'set' error: {e}")
        # --- CACHE SET ---

        return final_response
    
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise HTTPException(status_code=404, detail=f"Trial '{nctid}' not found on ClinicalTrials.gov.")
        raise HTTPException(status_code=502, detail=f"ClinicalTrials.gov returned an error (status {e.response.status_code}).")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@app.get("/finance/{ticker}", response_model=FinanceResponse)
async def get_stock_data(
    ticker: str,
    range: Literal["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "ytd", "max"] = Query("1mo"),
    interval: Literal["1m", "5m", "15m", "30m", "1h", "1d", "1wk", "1mo", "3mo"] = Query("1d")
):
    
    # Key includes all params to make it unique for each request combination
    cache_key = f"finance:{ENV}:{ticker}:{range}:{interval}"

    if redis_client:
        try:
            # --- 2. CHECK CACHE (non-blocking) ---
            cached_result = await run_in_threadpool(redis_client.get, cache_key)
            if cached_result:
                print(f"[Cache] HIT for finance:{ticker}")
                return json.loads(cached_result)
        except Exception as e:
            print(f"Redis 'get' error: {e}")
    
    print(f"[Cache] MISS for finance:{ticker}. Fetching from yfinance.")

    try:
        ticker_obj = await run_in_threadpool(yf.Ticker, ticker)
        hist = await run_in_threadpool(ticker_obj.history, period=range, interval=interval)

        if hist.empty:
            raise HTTPException(status_code=404, detail=f"No data found for ticker '{ticker}'.")

        prices = [
            {"date": str(idx.date()), "close": round(row["Close"], 2)}
            for idx, row in hist.iterrows()
        ]

        info = await run_in_threadpool(getattr, ticker_obj, 'info')

        metadata = {
            "marketCap": info.get("marketCap"),
            "enterpriseValue": info.get("enterpriseValue"),
            "trailingPE": info.get("trailingPE"),
            "forwardPE": info.get("forwardPE"),
            "pegRatio": info.get("pegRatio"),
            "priceToBook": info.get("priceToBook"),
            "beta": info.get("beta"),
            "dividendYield": info.get("dividendYield"),
            "returnOnEquity": info.get("returnOnEquity"),
            "revenueGrowth": info.get("revenueGrowth"),
            "grossMargins": info.get("grossMargins"),
            "operatingMargins": info.get("operatingMargins"),
            "profitMargins": info.get("profitMargins"),
            "totalRevenue": info.get("totalRevenue"),
            "ebitda": info.get("ebitda"),
            "totalDebt": info.get("totalDebt"),
            "currentRatio": info.get("currentRatio"),
            "quickRatio": info.get("quickRatio"),
            "sector": info.get("sector"),
            "industry": info.get("industry"),
            "summary": info.get("longBusinessSummary"),
            "fiftyTwoWeekHigh": info.get("fiftyTwoWeekHigh"),
            "fiftyTwoWeekLow": info.get("fiftyTwoWeekLow"),
        }

        final_response = {
            "ticker": ticker.upper(),
            "range": range,
            "interval": interval,
            "prices": prices,
            "metadata": metadata
        }

        # SET CACHE (non-blocking) ---
        if redis_client:
            try:
                # Set a 1-hour expiration (3600 seconds) for stock data
                await run_in_threadpool(
                    redis_client.set,
                    cache_key,
                    json.dumps(final_response),
                    ex=3600 
                )
                print(f"[Cache] SET for finance:{ticker}. TTL 1 hour.")
            except Exception as e:
                print(f"Redis 'set' error: {e}")
        
        return final_response

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")
