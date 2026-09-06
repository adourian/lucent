"""Registry-to-checkpoint phase regressions, without downloading encoders."""

import asyncio
import json
import os
from pathlib import Path
import sys
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import numpy as np
import pytest
import torch

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.parsing import parse_trial_json
from app.core.phases import UnsupportedPhaseError, normalize_phase
from app.core.predict import TrialPredictor
from app.core.preprocessing import preprocess_trial


# Expected checkpoint column positions from docs/phase-contract.md, independent
# of the runtime category constant. Every supported category is exercised.
CASES = [
    (["PHASE1"], "phase 1", 1),
    (["PHASE2"], "phase 2", 3),
    (["PHASE3"], "phase 3", 5),
    (["PHASE4"], "phase 4", 6),
    (["EARLY_PHASE1"], "early phase 1", 0),
    (["PHASE1", "PHASE2"], "phase 1/phase 2", 2),
    (["PHASE2", "PHASE1"], "phase 1/phase 2", 2),
    (["PHASE2", "PHASE3"], "phase 2/phase 3", 4),
    (["PHASE3", "PHASE2"], "phase 2/phase 3", 4),
    (["PHASE2", "PHASE2"], "phase 2", 3),
    ([], "nan", 7),
    (None, "nan", 7),
    (["NA"], "nan", 7),
    ("Phase-2/Phase-3", "phase 2/phase 3", 4),
    ("Early Phase 1", "early phase 1", 0),
    ("Phase 1/Phase 2", "phase 1/phase 2", 2),
    ("", "nan", 7),
    ("N/A", "nan", 7),
    ("nan", "nan", 7),
    (float("nan"), "nan", 7),
]


def raw_trial(phases):
    return {"protocolSection": {"designModule": {"phases": phases}}}


@pytest.mark.parametrize("raw, canonical, index", CASES)
def test_registry_to_phase_vector(raw, canonical, index):
    prepped = preprocess_trial(parse_trial_json(raw_trial(raw)))
    assert prepped["phase"] == canonical
    predictor = TrialPredictor.__new__(TrialPredictor)
    vector = predictor._encode_phase(prepped["phase"])
    np.testing.assert_array_equal(vector, np.eye(8, dtype=np.float32)[index])
    assert vector.dtype == np.float32
    # Direct predictor callers receive the same normalization and validation.
    np.testing.assert_array_equal(predictor._encode_phase(raw), vector)


def test_absent_phase_uses_missing_column():
    prepped = preprocess_trial(parse_trial_json({}))
    vector = TrialPredictor.__new__(TrialPredictor)._encode_phase(prepped["phase"])
    np.testing.assert_array_equal(vector, [0, 0, 0, 0, 0, 0, 0, 1])


@pytest.mark.parametrize("raw", [
    "PHASE5", "RandomString", 1, False, {}, [None], [""], [["PHASE1"]],
    ["PHASE1", "PHASE3"], ["PHASE3", "PHASE4"],
    ["PHASE1", "PHASE2", "PHASE3"], ["NA", "PHASE1"],
    ["EARLY_PHASE1", "PHASE1"], ["PHASE1", "PHASE5"],
])
def test_unknown_or_malformed_phase_never_produces_vector(raw):
    with pytest.raises(UnsupportedPhaseError):
        preprocess_trial(parse_trial_json(raw_trial(raw)))
    with pytest.raises(UnsupportedPhaseError):
        TrialPredictor.__new__(TrialPredictor)._encode_phase(raw)


@pytest.fixture
def checkpoint_predictor(monkeypatch):
    from app.core import predict

    embedder = SimpleNamespace(
        encode_sponsors=lambda _: np.zeros((1, 384), dtype=np.float32),
        encode_diseases=lambda _: np.zeros((1, 768), dtype=np.float32),
        encode_text_fields=lambda _: np.zeros((1, 768), dtype=np.float32),
    )
    monkeypatch.setattr(predict, "TrialEmbedder", lambda **_: embedder)
    weights = Path(__file__).resolve().parents[1] / "app/models/model_weights.pth"
    return TrialPredictor(str(weights), device="cpu")


@pytest.mark.parametrize("raw, canonical, index", CASES[:9] + CASES[10:13])
def test_both_inference_paths_receive_correct_checkpoint_input(
    checkpoint_predictor, raw, canonical, index,
):
    inputs = []
    handle = checkpoint_predictor.model.register_forward_pre_hook(
        lambda model, args: inputs.append(args[-1].detach().clone())
    )
    trial = preprocess_trial(parse_trial_json(raw_trial(raw)))
    try:
        checkpoint_predictor.predict(trial)
        checkpoint_predictor.predict_with_uncertainty(trial, n_samples=3)
    finally:
        handle.remove()
    assert [tuple(t.shape) for t in inputs] == [(1, 8), (1, 8), (3, 8)]
    for tensor in inputs:
        expected = torch.eye(8)[index].expand(tensor.shape[0], -1)
        torch.testing.assert_close(tensor, expected, rtol=0, atol=0)


@pytest.fixture
def api(monkeypatch):
    monkeypatch.delenv("REDIS_URL", raising=False)
    from app import main

    monkeypatch.setattr(main, "redis_client", None)
    monkeypatch.setattr(main, "app_state", {
        "http_client": object(),
        "predictor": SimpleNamespace(predict_with_uncertainty=Mock(return_value={
            "probability": 0.5, "deterministic": 0.5, "uncertainty": 0.1,
            "label": 1,
        })),
    })
    return main


def test_api_rejects_unsupported_phase_without_inference(api, monkeypatch):
    monkeypatch.setattr(api, "fetch_nctid_data_async", AsyncMock(
        return_value=raw_trial(["PHASE1", "PHASE3"]),
    ))
    with pytest.raises(api.HTTPException) as exc:
        asyncio.run(api.predict_trial("NCT00000001"))
    assert exc.value.status_code == 422
    assert "Unsupported trial phase combination" in exc.value.detail
    api.app_state["predictor"].predict_with_uncertainty.assert_not_called()


def test_api_ignores_old_phase_cache_and_reuses_corrected_result(api, monkeypatch):
    nctid = "NCT00000001"
    old_key = f"nctid:{api.ENV}:{nctid}"
    entries = {old_key: json.dumps({"phase": "phase 1"})}
    cache = SimpleNamespace(get=Mock(side_effect=entries.get),
                            set=Mock(side_effect=entries.__setitem__))
    monkeypatch.setattr(api, "redis_client", cache)
    fetch = AsyncMock(return_value=raw_trial(["PHASE1", "PHASE2"]))
    monkeypatch.setattr(api, "fetch_nctid_data_async", fetch)
    result = asyncio.run(api.predict_trial(nctid))
    assert result["phase"] == "phase 1/phase 2"
    assert asyncio.run(api.predict_trial(nctid)) == result
    fetch.assert_awaited_once()
    cache.set.assert_called_once()
    assert cache.get.call_args.args[0] != old_key
    assert entries[old_key] == json.dumps({"phase": "phase 1"})
