import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

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
    allowed_origins = [
        "to_fill_later",
        "to_fill_later",
        # Add other production domains here
    ]
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

@app.get("/predict/{nctid}")
def predict_trial(nctid: str):
    try:
        trial_data = fetch_nctid_data(nctid)
        parsed = parse_trial_json(trial_data)
        prepped = preprocess_trial(parsed)
        result = predictor.predict_with_uncertainty(prepped, n_samples=1000)
        print(f"[Lucent] {nctid} | Deterministic: {result['deterministic']} | MC: {result['probability']} ± {result['uncertainty']}")
        return {"nctid": nctid, **result}
    except Exception as e:
        return {"error": str(e)}