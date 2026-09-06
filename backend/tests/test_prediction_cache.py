"""Prediction identity, TTL and timestamp behavior through the HTTP endpoint."""

from copy import deepcopy
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
import sys
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

from fastapi.testclient import TestClient
import pytest

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.core import prediction_identity as identity


@pytest.fixture
def api(monkeypatch):
    monkeypatch.delenv("REDIS_URL", raising=False)
    from app import main

    clock = [datetime(2026, 9, 6, 10, 0, tzinfo=timezone.utc)]
    monkeypatch.setattr(main, "datetime", SimpleNamespace(now=lambda _: clock[0]))
    entries = {}
    expiries = {}

    def get(key):
        if key in expiries and clock[0] >= expiries[key]:
            entries.pop(key, None)
        return entries.get(key)

    def set_value(key, value, *, ex):
        entries[key] = value
        expiries[key] = clock[0] + timedelta(seconds=ex)

    cache = SimpleNamespace(get=Mock(side_effect=get), set=Mock(side_effect=set_value))
    predictor = SimpleNamespace(
        identity={"model_id": "weights-a", "preprocessing_id": "preprocessing-a",
                  "encoder_id": "encoders-a", "artifact_id": "artifact-a"},
        predict_with_uncertainty=Mock(return_value={
            "probability": 0.5, "uncertainty": 0.1, "deterministic": 0.51, "label": 1,
        }),
    )
    record = {"protocolSection": {
        "designModule": {"phases": ["PHASE2"], "studyType": "INTERVENTIONAL"},
        "descriptionModule": {"briefSummary": "Study of treatment for diabetes."},
        "conditionsModule": {"conditions": ["Diabetes"]},
        "eligibilityModule": {"eligibilityCriteria": "Adults with diabetes."},
        "sponsorCollaboratorsModule": {"leadSponsor": {"name": "Example sponsor"}},
        "statusModule": {"lastUpdatePostDateStruct": {"date": "2026-09-04"}},
    }}
    fetch = AsyncMock(return_value=record)
    monkeypatch.setattr(main, "app_state", {"predictor": predictor, "http_client": object()})
    monkeypatch.setattr(main, "redis_client", cache)
    monkeypatch.setattr(main, "fetch_nctid_data_async", fetch)
    monkeypatch.setattr(main, "schedule_request_counter", Mock())
    # No lifespan: dependencies above avoid external Redis/model/registry access.
    client = TestClient(main.app)
    yield SimpleNamespace(client=client, predictor=predictor, fetch=fetch, record=record,
                          cache=cache, clock=clock, entries=entries, main=main)
    client.close()


def prediction(api, nctid="NCT00000001"):
    response = api.client.get(f"/predict/{nctid}")
    assert response.status_code == 200, response.text
    assert response.headers["cache-control"] == "no-store"
    return response.json()


def test_fresh_prediction_gets_server_creation_time_after_inference(api):
    def infer(*args, **kwargs):
        api.clock[0] += timedelta(seconds=5)
        return {"probability": 0.5, "uncertainty": 0.1, "deterministic": 0.51, "label": 1}

    api.predictor.predict_with_uncertainty.side_effect = infer
    result = prediction(api)
    assert result["generated_at"] == "2026-09-06T10:00:05Z"
    assert result["source_fetched_at"] == "2026-09-06T10:00:00Z"
    assert result["source_last_updated"] == "2026-09-04"
    assert result["cache_hit"] is False
    assert result["source_hash"] == identity.payload_hash(api.record)
    assert result["model_id"] == "weights-a"
    assert api.cache.set.call_args.kwargs == {"ex": 86400}


def test_unchanged_artifact_and_evidence_reuse_original_timestamp(api):
    first = prediction(api)
    api.clock[0] += timedelta(hours=2)
    second = prediction(api)
    assert second == {**first, "cache_hit": True}
    assert api.fetch.await_count == 2
    api.predictor.predict_with_uncertainty.assert_called_once()
    api.cache.set.assert_called_once()  # Cache hits do not extend TTL.


def test_different_artifact_cannot_reuse_previous_prediction(api):
    first = prediction(api)
    api.predictor.identity = {**api.predictor.identity, "model_id": "weights-b",
                              "artifact_id": "artifact-b"}
    api.clock[0] += timedelta(minutes=1)
    second = prediction(api)
    assert second["cache_hit"] is False
    assert second["model_id"] == "weights-b"
    assert second["generated_at"] != first["generated_at"]
    assert len(api.entries) == 2
    assert api.predictor.predict_with_uncertainty.call_count == 2


def test_changed_registry_payload_recomputes_prediction(api):
    first = prediction(api)
    api.record["protocolSection"]["designModule"]["phases"] = ["PHASE3"]
    second = prediction(api)
    assert second["cache_hit"] is False
    assert second["phase"] == "phase 3"
    assert second["source_hash"] != first["source_hash"]
    assert len(api.entries) == 2


def test_expired_prediction_is_recomputed(api):
    first = prediction(api)
    api.clock[0] += timedelta(hours=24, seconds=1)
    second = prediction(api)
    assert second["cache_hit"] is False
    assert second["generated_at"] != first["generated_at"]
    assert api.predictor.predict_with_uncertainty.call_count == 2


def test_legacy_and_phase_only_keys_are_never_read(api):
    keys = [f"nctid:{api.main.ENV}:NCT00000001",
            f"nctid:{api.main.ENV}:phase-v2:NCT00000001"]
    for key in keys:
        api.entries[key] = json.dumps({"probability": 0.99})
    assert prediction(api)["cache_hit"] is False
    assert api.cache.get.call_args.args[0] not in keys
    assert all(key in api.entries for key in keys)


@pytest.mark.parametrize("bad_field, value", [("generated_at", None),
                                               ("source_hash", "different")])
def test_incomplete_or_mismatched_cache_entry_is_recomputed(api, bad_field, value):
    prediction(api)
    key = api.cache.get.call_args.args[0]
    corrupted = json.loads(api.entries[key])
    corrupted[bad_field] = value
    api.entries[key] = json.dumps(corrupted)
    assert prediction(api)["cache_hit"] is False
    assert api.predictor.predict_with_uncertainty.call_count == 2


def test_registry_failure_does_not_serve_unchecked_cache(api):
    import httpx

    prediction(api)
    request = httpx.Request("GET", "https://clinicaltrials.gov/api/v2/studies/NCT00000001")
    api.fetch.side_effect = httpx.HTTPStatusError(
        "Unavailable", request=request, response=httpx.Response(503, request=request),
    )
    response = api.client.get("/predict/NCT00000001")
    assert response.status_code == 502
    api.predictor.predict_with_uncertainty.assert_called_once()


def test_cache_outage_still_returns_dated_prediction(api):
    api.cache.get.side_effect = ConnectionError("offline")
    api.cache.set.side_effect = ConnectionError("offline")
    result = prediction(api)
    assert result["cache_hit"] is False
    assert result["generated_at"] == "2026-09-06T10:00:00Z"


def test_payload_hash_ignores_object_key_order_but_tracks_content():
    assert identity.payload_hash({"a": 1, "b": 2}) == identity.payload_hash({"b": 2, "a": 1})
    assert identity.payload_hash({"a": 1}) != identity.payload_hash({"a": 2})
    assert identity.prediction_cache_key("prod", "NCT1", "a", "s") != \
        identity.prediction_cache_key("prod", "NCT2", "a", "s")


def test_artifact_identity_tracks_actual_checkpoint_bytes(tmp_path):
    weights = tmp_path / "checkpoint.pth"
    weights.write_bytes(b"checkpoint-a")
    first = identity.build_artifact_identity(str(weights), "cpu")
    assert first == identity.build_artifact_identity(str(weights), "cpu")
    weights.write_bytes(b"checkpoint-b")
    second = identity.build_artifact_identity(str(weights), "cpu")
    assert second["artifact_id"] != first["artifact_id"]
    assert second["model_id"] != first["model_id"]


@pytest.mark.parametrize("source_name", ["parsing.py", "preprocessing.py", "phases.py", "eligibility.py",
                                       "generate_embeddings.py", "predict.py", "model.py"])
def test_artifact_changes_when_pipeline_source_changes(tmp_path, monkeypatch, source_name):
    weights = tmp_path / "checkpoint.pth"
    weights.write_bytes(b"checkpoint")
    first = identity.build_artifact_identity(str(weights), "cpu")
    real_hash = identity.file_hash
    monkeypatch.setattr(identity, "file_hash", lambda path:
                        "modified" if path.name == source_name else real_hash(path))
    second = identity.build_artifact_identity(str(weights), "cpu")
    assert second["artifact_id"] != first["artifact_id"]


def test_artifact_changes_with_encoder_revision_or_runtime(tmp_path, monkeypatch):
    weights = tmp_path / "checkpoint.pth"
    weights.write_bytes(b"checkpoint")
    first = identity.build_artifact_identity(str(weights), "cpu")
    encoders = deepcopy(identity.ENCODERS)
    encoders["text"]["revision"] = "a" * 40
    monkeypatch.setattr(identity, "ENCODERS", encoders)
    second = identity.build_artifact_identity(str(weights), "cpu")
    assert second["artifact_id"] != first["artifact_id"]
    assert second["encoder_id"] != first["encoder_id"]
    monkeypatch.setattr(identity, "version", lambda _: "updated")
    third = identity.build_artifact_identity(str(weights), "cpu")
    assert third["artifact_id"] != second["artifact_id"]
