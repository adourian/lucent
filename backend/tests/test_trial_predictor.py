import pytest
import numpy as np
import torch

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.predict import TrialPredictor


@pytest.fixture
def mock_trial_dict():
    return {
        "sponsor": "Pfizer",
        "diseases": "Diabetes",
        "inclusion_criteria": "Patients must be over 18 years old.",
        "exclusion_criteria": "No recent heart attack.",
        "description": "A trial evaluating a new insulin delivery method.",
        "phase": "Phase 2"
    }


@pytest.fixture
def real_model_predictor(monkeypatch):
    model_path = "../backend/app/models/model_weights.pth"
    predictor = TrialPredictor(model_path=model_path, device="cpu")

    # Patch embeddings to fixed vectors matching expected dimensions
    monkeypatch.setattr(predictor.embedder, "encode_sponsors", lambda x: np.random.rand(1, 384).astype(np.float32))
    monkeypatch.setattr(predictor.embedder, "encode_diseases", lambda x: np.random.rand(1, 768).astype(np.float32))
    monkeypatch.setattr(predictor.embedder, "encode_text_fields", lambda x: np.random.rand(1, 768).astype(np.float32))

    return predictor


def test_real_model_predict(real_model_predictor, mock_trial_dict):
    result = real_model_predictor.predict(mock_trial_dict)
    assert isinstance(result, dict)
    assert 0.0 <= result["probability"] <= 1.0
    assert result["label"] in [0, 1]


def test_real_model_predict_with_uncertainty(real_model_predictor, mock_trial_dict):
    result = real_model_predictor.predict_with_uncertainty(mock_trial_dict, n_samples=5)
    assert isinstance(result, dict)
    assert 0.0 <= result["probability"] <= 1.0
    assert 0.0 <= result["uncertainty"] <= 1.0
    assert 0.0 <= result["deterministic"] <= 1.0
    assert result["label"] in [0, 1]