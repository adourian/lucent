from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware


from app.core.parsing import parse_trial_json
from app.core.preprocessing import preprocess_trial
from app.services.clinicaltrials_api import fetch_nctid_data
from app.core.predict import TrialPredictor

# Load model once at startup
predictor = TrialPredictor(model_path="app/models/model_weights.pth")

# FastAPI app
app = FastAPI(
    title="Lucent Clinical Trial Success Predictor",
    description="Enter an NCTID to get success prediction with uncertainty estimation.",
    version="0.1"
)

# CORS setup to allow frontend (React) to communicate with this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/predict/{nctid}")
def predict_trial(nctid: str):
    try:
        trial_data = fetch_nctid_data(nctid)
        parsed = parse_trial_json(trial_data)
        prepped = preprocess_trial(parsed)
        result = predictor.predict_with_uncertainty(prepped)
        return {"nctid": nctid, **result}
    except Exception as e:
        return {"error": str(e)}