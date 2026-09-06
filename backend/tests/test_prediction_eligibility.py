"""Eligibility gates raw registry input before either cache access or inference."""

from copy import deepcopy
import json
from pathlib import Path
import sys
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

from fastapi.testclient import TestClient
import pytest

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.core.eligibility import assess_prediction_eligibility


def supported_record():
    return {"protocolSection": {
        "identificationModule": {"nctId": "NCT00000001", "briefTitle": "Treatment study"},
        "designModule": {"phases": ["PHASE2", "PHASE3"], "studyType": "INTERVENTIONAL"},
        "descriptionModule": {"briefSummary": "Evaluation of a treatment for diabetes."},
        "conditionsModule": {"conditions": ["Diabetes"]},
        "eligibilityModule": {"eligibilityCriteria": "Inclusion Criteria: Adults with diabetes. Exclusion Criteria: Pregnancy."},
        "sponsorCollaboratorsModule": {"leadSponsor": {"name": "Example sponsor"}},
    }}


def assess(record):
    return assess_prediction_eligibility(record, "NCT00000001")


def test_supported_combined_phase_and_optional_report_fields():
    record = supported_record()
    original = deepcopy(record)
    result = assess(record)
    assert result.eligible
    assert result.status == "supported"
    assert result.prepared_trial["phase"] == "phase 2/phase 3"
    assert result.prepared_trial["enrollment"] == ""
    assert result.prepared_trial["completion_date"] == ""
    assert record == original


@pytest.mark.parametrize("phase", [None, [], ["NA"]])
def test_missing_phase_is_supported_by_the_trained_missing_category(phase):
    record = supported_record()
    record["protocolSection"]["designModule"]["phases"] = phase
    result = assess(record)
    assert result.eligible
    assert result.status == "supported_with_missing"
    assert result.missing_fields == ["phase"]
    assert result.prepared_trial["phase"] == "nan"


def test_missing_study_type_or_separate_exclusion_section_is_not_a_rejection():
    record = supported_record()
    del record["protocolSection"]["designModule"]["studyType"]
    record["protocolSection"]["eligibilityModule"]["eligibilityCriteria"] = "Adults with diabetes."
    result = assess(record)
    assert result.eligible
    assert result.status == "supported_with_missing"
    assert result.missing_fields == ["study_type", "exclusion_criteria"]
    assert result.prepared_trial["exclusion_criteria"] == "No exclusion criteria found."


@pytest.mark.parametrize("phases", [["EARLY_PHASE1"], ["PHASE1"], ["PHASE2"], ["PHASE3"],
                                    ["PHASE4"], ["PHASE1", "PHASE2"]])
def test_all_other_trained_phase_categories_remain_supported(phases):
    record = supported_record()
    record["protocolSection"]["designModule"]["phases"] = phases
    assert assess(record).eligible


@pytest.mark.parametrize("study_type", ["OBSERVATIONAL", "EXPANDED_ACCESS", "NEW_STUDY_TYPE"])
def test_explicit_unsupported_study_type(study_type):
    record = supported_record()
    record["protocolSection"]["designModule"]["studyType"] = study_type
    result = assess(record)
    assert result.status == "unsupported"
    assert result.reasons[0].code == "UNSUPPORTED_STUDY_TYPE"


@pytest.mark.parametrize("phases", [["PHASE5"], ["PHASE1", "PHASE3"], ["NA", "PHASE2"]])
def test_unsupported_phase_abstains(phases):
    record = supported_record()
    record["protocolSection"]["designModule"]["phases"] = phases
    result = assess(record)
    assert result.status == "unsupported"
    assert result.reasons[0].code == "UNSUPPORTED_PHASE"


def test_effectively_empty_record_reports_all_critical_omissions():
    result = assess({"protocolSection": {}})
    assert result.status == "insufficient_input"
    assert {reason.code for reason in result.reasons} == {
        "MISSING_BRIEF_SUMMARY", "MISSING_CONDITIONS", "MISSING_ELIGIBILITY_CRITERIA", "MISSING_SPONSOR",
    }
    assert result.prepared_trial is None


@pytest.mark.parametrize("module, name, value, code", [
    ("descriptionModule", "briefSummary", None, "MISSING_BRIEF_SUMMARY"),
    ("descriptionModule", "briefSummary", " \n ", "MISSING_BRIEF_SUMMARY"),
    ("descriptionModule", "briefSummary", "N/A", "MISSING_BRIEF_SUMMARY"),
    ("conditionsModule", "conditions", [], "MISSING_CONDITIONS"),
    ("conditionsModule", "conditions", [" ", "[]"], "MISSING_CONDITIONS"),
    ("eligibilityModule", "eligibilityCriteria", None, "MISSING_ELIGIBILITY_CRITERIA"),
    ("eligibilityModule", "eligibilityCriteria", "Inclusion Criteria: Exclusion Criteria:", "MISSING_ELIGIBILITY_CRITERIA"),
    ("eligibilityModule", "eligibilityCriteria", "inclusion criteria: exclusion criteria:", "MISSING_ELIGIBILITY_CRITERIA"),
    ("sponsorCollaboratorsModule", "leadSponsor", {}, "MISSING_SPONSOR"),
])
def test_required_model_fields_must_have_content(module, name, value, code):
    record = supported_record()
    record["protocolSection"][module][name] = value
    result = assess(record)
    assert result.status == "insufficient_input"
    assert [reason.code for reason in result.reasons] == [code]


def test_short_text_and_healthy_volunteers_are_not_rejected_by_length_or_disease_heuristics():
    record = supported_record()
    record["protocolSection"]["descriptionModule"]["briefSummary"] = "Safety study."
    record["protocolSection"]["conditionsModule"]["conditions"] = ["Healthy volunteers"]
    record["protocolSection"]["eligibilityModule"]["eligibilityCriteria"] = "Adults."
    assert assess(record).eligible


@pytest.mark.parametrize("value", [None, [], "upstream error", {}, {"protocolSection": None},
                                   {"protocolSection": []}])
def test_malformed_envelope(value):
    result = assess(value)
    assert result.status == "malformed_upstream"
    assert result.reasons[0].code == "MALFORMED_UPSTREAM_DATA"


@pytest.mark.parametrize("module, name, value", [
    ("descriptionModule", "briefSummary", ["summary"]),
    ("eligibilityModule", "eligibilityCriteria", 123),
    ("conditionsModule", "conditions", "Diabetes"),
    ("conditionsModule", "conditions", [None]),
    ("sponsorCollaboratorsModule", "leadSponsor", "Sponsor"),
    ("designModule", "phases", "PHASE2"),
    ("designModule", "phases", [1]),
    ("designModule", "studyType", False),
    ("designModule", "enrollmentInfo", {"count": float("nan")}),
    ("statusModule", "completionDateStruct", []),
])
def test_malformed_field_types(module, name, value):
    record = supported_record()
    record["protocolSection"].setdefault(module, {})[name] = value
    assert assess(record).status == "malformed_upstream"


def test_mismatched_trial_id_is_not_scored():
    record = supported_record()
    record["protocolSection"]["identificationModule"]["nctId"] = "NCT00000002"
    assert assess(record).reasons[0].code == "TRIAL_ID_MISMATCH"


@pytest.fixture
def api(monkeypatch):
    monkeypatch.delenv("REDIS_URL", raising=False)
    from app import main

    predictor = SimpleNamespace(
        identity={"artifact_id": "a", "model_id": "m", "encoder_id": "e", "preprocessing_id": "p"},
        predict_with_uncertainty=Mock(return_value={
            "probability": 0.5, "uncertainty": 0.1, "deterministic": 0.51, "label": 1,
        }),
    )
    cache = SimpleNamespace(get=Mock(return_value=None), set=Mock())
    fetch = AsyncMock(return_value=supported_record())
    monkeypatch.setattr(main, "app_state", {"predictor": predictor, "http_client": object()})
    monkeypatch.setattr(main, "fetch_nctid_data_async", fetch)
    monkeypatch.setattr(main, "redis_client", cache)
    monkeypatch.setattr(main, "schedule_request_counter", Mock())
    client = TestClient(main.app)
    yield SimpleNamespace(client=client, predictor=predictor, cache=cache, fetch=fetch)
    client.close()


@pytest.mark.parametrize("record, status, category", [
    ({"protocolSection": {}}, 422, "insufficient_input"),
    ({"protocolSection": {"designModule": {"phases": ["PHASE5"]}}}, 422, "unsupported"),
    ([], 502, "malformed_upstream"),
    ({"protocolSection": {"conditionsModule": "broken"}}, 502, "malformed_upstream"),
])
def test_api_abstains_before_cache_or_inference(api, record, status, category):
    api.fetch.return_value = record
    # Even a cached probability must not bypass the input gate.
    api.cache.get.return_value = json.dumps({"probability": 0.99})
    response = api.client.get("/predict/NCT00000001")
    assert response.status_code == status
    result = response.json()
    assert result["status"] == "abstained"
    assert result["category"] == category
    assert result["message"]
    assert result["reasons"]
    assert not {"probability", "uncertainty", "deterministic", "label"} & result.keys()
    api.predictor.predict_with_uncertainty.assert_not_called()
    api.cache.get.assert_not_called()
    api.cache.set.assert_not_called()


def test_invalid_upstream_json_has_structured_abstention(api):
    api.fetch.side_effect = json.JSONDecodeError("invalid", "", 0)
    response = api.client.get("/predict/NCT00000001")
    assert response.status_code == 502
    assert response.json()["category"] == "malformed_upstream"
    api.predictor.predict_with_uncertainty.assert_not_called()


def test_supported_partial_record_returns_prediction_and_explicit_missingness(api):
    record = supported_record()
    record["protocolSection"]["designModule"]["phases"] = []
    record["protocolSection"]["statusModule"] = None
    record["protocolSection"]["identificationModule"]["briefTitle"] = None
    api.fetch.return_value = record
    response = api.client.get("/predict/NCT00000001")
    assert response.status_code == 200, response.text
    result = response.json()
    assert result["phase"] == "nan"
    assert result["input_status"] == "supported_with_missing"
    assert result["missing_fields"] == ["phase"]
    assert result["source_last_updated"] is None
    assert result["title"] == ""
    api.predictor.predict_with_uncertainty.assert_called_once()
