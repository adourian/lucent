"""Central input gate for registry predictions; see docs/prediction-eligibility.md."""

from copy import deepcopy
from dataclasses import dataclass, field
import json
import re
from typing import Any, Literal

from pydantic import BaseModel

from .parsing import parse_trial_json
from .phases import UnsupportedPhaseError, normalize_phase
from .preprocessing import clean_criteria, preprocess_trial


class InputIssue(BaseModel):
    code: str
    field: str
    message: str


class AbstentionResponse(BaseModel):
    status: Literal["abstained"] = "abstained"
    category: Literal["unsupported", "insufficient_input", "malformed_upstream"]
    message: str
    reasons: list[InputIssue]


@dataclass
class EligibilityDecision:
    status: Literal["supported", "supported_with_missing", "unsupported",
                    "insufficient_input", "malformed_upstream"]
    reasons: list[InputIssue] = field(default_factory=list)
    missing_fields: list[str] = field(default_factory=list)
    prepared_trial: dict[str, Any] | None = None

    @property
    def eligible(self) -> bool:
        return self.status in {"supported", "supported_with_missing"}

    def abstention(self) -> AbstentionResponse:
        messages = {
            "unsupported": "This trial cannot currently be evaluated because its study type or phase is unsupported.",
            "insufficient_input": "This trial cannot currently be evaluated because required clinical information is missing.",
            "malformed_upstream": "This trial cannot currently be evaluated because the registry returned a malformed record.",
        }
        return AbstentionResponse(category=self.status, message=messages[self.status],
                                  reasons=self.reasons)


# Validate only fields/containers consumed by parsing, scope checks or the report.
# Null optional containers are treated as absent; wrong types are never coerced.
OBJECT_PATHS = (
    "identificationModule", "descriptionModule", "conditionsModule",
    "eligibilityModule", "sponsorCollaboratorsModule",
    "sponsorCollaboratorsModule.leadSponsor", "designModule",
    "designModule.enrollment", "designModule.enrollmentInfo", "statusModule",
    "statusModule.completionDateStruct", "statusModule.lastUpdatePostDateStruct",
)
STRING_PATHS = (
    "identificationModule.nctId", "identificationModule.briefTitle",
    "descriptionModule.briefSummary", "eligibilityModule.eligibilityCriteria",
    "sponsorCollaboratorsModule.leadSponsor.name", "designModule.studyType",
    "statusModule.overallStatus", "statusModule.completionDateStruct.date",
    "statusModule.lastUpdatePostDateStruct.date",
)
LIST_PATHS = ("conditionsModule.conditions", "designModule.phases")


def _get(record, path):
    for key in path.split("."):
        if not isinstance(record, dict):
            return None
        record = record.get(key)
    return record


def _default_null(record, path, default):
    parent, _, name = path.rpartition(".")
    container = _get(record, parent) if parent else record
    if isinstance(container, dict) and container.get(name) is None:
        container[name] = default


def _has_content(value: str) -> bool:
    return value.strip().lower() not in {
        "", "na", "n/a", "nan", "null", "none", "not reported", "not provided",
    } and any(character.isalnum() for character in value)


def assess_prediction_eligibility(data: Any, expected_nctid: str) -> EligibilityDecision:
    """Validate raw structure and usable model inputs before cache or inference.

    Missing phase is supported by the checkpoint. No minimum text length,
    enrollment, recruitment-status or intervention-modality threshold is used.
    The original payload is never mutated (it remains the source cache identity).
    """
    def issue(code, path, message):
        return InputIssue(code=code, field=path, message=message)

    if not isinstance(data, dict) or not isinstance(data.get("protocolSection"), dict):
        return EligibilityDecision("malformed_upstream", [issue(
            "MALFORMED_UPSTREAM_DATA", "protocolSection", "The registry study record is missing or malformed.",
        )])
    protocol = data["protocolSection"]
    try:
        json.dumps(data, allow_nan=False)
    except (TypeError, ValueError):
        return EligibilityDecision("malformed_upstream", [issue(
            "MALFORMED_UPSTREAM_DATA", "record", "The registry record contains invalid JSON values.",
        )])
    malformed = []
    for path in OBJECT_PATHS + STRING_PATHS + LIST_PATHS:
        value = _get(protocol, path)
        if value is None:
            continue
        if path in OBJECT_PATHS:
            valid = isinstance(value, dict)
        elif path in STRING_PATHS:
            valid = isinstance(value, str)
        else:
            valid = isinstance(value, list) and all(isinstance(item, str) for item in value)
        if not valid:
            malformed.append(issue("INVALID_FIELD_TYPE", path, "A registry field has an invalid format."))
    for path in ("designModule.enrollment.count", "designModule.enrollmentInfo.count"):
        value = _get(protocol, path)
        if value is not None and type(value) not in (int, str):
            malformed.append(issue("INVALID_FIELD_TYPE", path, "Registry enrollment has an invalid format."))
    nctid = _get(protocol, "identificationModule.nctId")
    if isinstance(nctid, str) and nctid.strip().upper() != expected_nctid:
        malformed.append(issue("TRIAL_ID_MISMATCH", "identificationModule.nctId",
                               "The registry record does not match the requested trial."))
    if malformed:
        return EligibilityDecision("malformed_upstream", malformed)

    # Normalize nulls only after type validation, preserving parser defaults.
    sanitized = deepcopy(data)
    protocol = sanitized["protocolSection"]
    for path in OBJECT_PATHS:
        _default_null(protocol, path, {})
    for path in STRING_PATHS:
        _default_null(protocol, path, "")
    for path in LIST_PATHS:
        _default_null(protocol, path, [])
    for path in ("designModule.enrollment.count", "designModule.enrollmentInfo.count"):
        _default_null(protocol, path, "")

    parsed = parse_trial_json(sanitized)
    missing_fields = []
    unsupported = []
    try:
        phase = normalize_phase(parsed["phase"])
        if phase == "nan":
            missing_fields.append("phase")
    except UnsupportedPhaseError:
        unsupported.append(issue("UNSUPPORTED_PHASE", "phase",
                                 "The trial phase cannot be represented by the current model."))
    study_type = parsed["study_type"].strip().upper()
    if not study_type:
        missing_fields.append("study_type")
    elif study_type != "INTERVENTIONAL":
        unsupported.append(issue("UNSUPPORTED_STUDY_TYPE", "study_type",
                                 "Lucent currently evaluates interventional trials only."))

    insufficient = []
    criteria_content = re.sub(r"\b(?:inclusion|exclusion|criteria)\b", "",
                              clean_criteria(parsed["eligibility"]), flags=re.IGNORECASE)
    required = (
        ("brief_summary", _has_content(parsed["brief_summary"]), "MISSING_BRIEF_SUMMARY", "A brief summary is required."),
        ("conditions", any(_has_content(item) for item in parsed["diseases"]), "MISSING_CONDITIONS", "At least one condition is required."),
        ("eligibility_criteria", _has_content(criteria_content), "MISSING_ELIGIBILITY_CRITERIA", "Eligibility criteria containing more than section headings are required."),
        ("sponsor", _has_content(parsed["sponsor"]), "MISSING_SPONSOR", "A lead sponsor is required."),
    )
    for name, present, code, message in required:
        if not present:
            insufficient.append(issue(code, name, message))
    if unsupported or insufficient:
        return EligibilityDecision("unsupported" if unsupported else "insufficient_input",
                                   unsupported + insufficient, missing_fields)

    prepped = preprocess_trial(parsed)
    prepped["source_last_updated"] = _get(protocol, "statusModule.lastUpdatePostDateStruct.date") or None
    if prepped["exclusion_criteria"] == "No exclusion criteria found." or not prepped["exclusion_criteria"].strip():
        missing_fields.append("exclusion_criteria")
    return EligibilityDecision("supported_with_missing" if missing_fields else "supported",
                               missing_fields=missing_fields, prepared_trial=prepped)
