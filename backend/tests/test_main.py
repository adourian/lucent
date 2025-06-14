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