import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch


import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import app

client = TestClient(app)


def test_predict_success():
    fake_response = {
        "protocolSection": {
            "sponsorCollaboratorsModule": {"leadSponsor": {"name": "Test Pharma"}},
            "descriptionModule": {"briefSummary": "Study description"},
            "eligibilityModule": {"eligibilityCriteria": "Inclusion: A. Exclusion: B."},
            "conditionsModule": {"conditions": ["Cancer"]},
            "designModule": {"phases": ["Phase 1"]}
        },
        "hasResults": True
    }

    with patch("app.services.clinicaltrials_api.fetch_nctid_data", return_value=fake_response):
        with patch("app.core.predict.TrialPredictor.predict_with_uncertainty", return_value={
            "probability": 0.87,
            "uncertainty": 0.04,
            "label": 1,
            "deterministic": 0.84
        }):
            response = client.get("/predict/NCT00000172")
            assert response.status_code == 200
            data = response.json()
            assert data["nctid"] == "NCT00000172"
            assert "probability" in data
            assert "uncertainty" in data


def test_predict_failure():
    with patch("app.services.clinicaltrials_api.fetch_nctid_data", side_effect=Exception("API failure")):
        response = client.get("/predict/NCTFAIL123")
        assert response.status_code == 200
        assert "error" in response.json()


def test_get_stock_data_valid():
    response = client.get("/finance/PFE?range=1mo&interval=1d")
    assert response.status_code == 200
    data = response.json()
    
    # Basic checks
    assert data["ticker"] == "PFE"
    assert data["range"] == "1mo"
    assert data["interval"] == "1d"

    # Prices
    assert isinstance(data["prices"], list)
    assert len(data["prices"]) > 0
    assert "date" in data["prices"][0]
    assert "close" in data["prices"][0]

    # Metadata checks
    assert "metadata" in data
    assert isinstance(data["metadata"], dict)
    assert "marketCap" in data["metadata"]

def test_get_stock_data_invalid_ticker():
    response = client.get("/finance/INVALIDTICKER?range=1mo&interval=1d")
    assert response.status_code == 404

def test_get_stock_data_invalid_range():
    response = client.get("/finance/PFE?range=999y&interval=1d")
    assert response.status_code in [400, 422]