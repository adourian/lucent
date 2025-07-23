import os
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf
from typing import Literal



from app.core.parsing import parse_trial_json
from app.core.preprocessing import preprocess_trial
from app.services.clinicaltrials_api import fetch_nctid_data
from app.core.predict import TrialPredictor

# Load model once at startup
predictor = TrialPredictor(model_path="app/models/model_weights.pth")

app = FastAPI(
    title="Lucent",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Environment-based CORS configuration
ENV = os.getenv("ENV", "development")

if ENV == "production":
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

@app.get("/predict/{nctid}", include_in_schema=False)
@app.head("/predict/{nctid}")
def predict_trial(nctid: str):
    try:
        trial_data = fetch_nctid_data(nctid)
        parsed = parse_trial_json(trial_data)
        prepped = preprocess_trial(parsed)
        result = predictor.predict_with_uncertainty(prepped, n_samples=500)

        print(f"[Lucent] {nctid} | Deterministic: {result['deterministic']} | MC: {result['probability']} ± {result['uncertainty']}")

        return {
            "nctid": nctid,
            "phase": prepped["phase"],
            "sponsor": prepped["sponsor"],
            "title": prepped.get("title", ""),
            "status": prepped.get("status", ""),
            "diseases": prepped.get("diseases", ""),
            "enrollment": prepped.get("enrollment", ""),
            "completion_date": prepped.get("completion_date", ""),
            **result
        }
    except Exception as e:
        return {"error": str(e)}
    

@app.get("/finance/{ticker}")
def get_stock_data(
    ticker: str,
    range: Literal["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "ytd", "max"] = Query("1mo"),
    interval: Literal["1m", "5m", "15m", "30m", "1h", "1d", "1wk", "1mo", "3mo"] = Query("1d")
):
    try:
        ticker_obj = yf.Ticker(ticker)
        hist = ticker_obj.history(period=range, interval=interval)

        if hist.empty:
            raise HTTPException(status_code=404, detail=f"No data found for ticker '{ticker}'.")

        prices = [
            {"date": str(idx.date()), "close": round(row["Close"], 2)}
            for idx, row in hist.iterrows()
        ]

        info = ticker_obj.info

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

        return {
            "ticker": ticker.upper(),
            "range": range,
            "interval": interval,
            "prices": prices,
            "metadata": metadata
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")
    