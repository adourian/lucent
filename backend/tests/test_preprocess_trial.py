import pytest

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.preprocessing import (
    normalize_phase,
    clean_criteria,
    split_criteria,
    clean_and_join_diseases,
    preprocess_trial,
)


def test_normalize_phase():
    assert normalize_phase("Phase 1") == "phase 1"
    assert normalize_phase("phase2") == "phase 2"
    assert normalize_phase("Phase-2/Phase-3") == "phase 2/phase 3"
    assert normalize_phase("RandomString") == "randomstring"
    assert normalize_phase("") == "na"


def test_clean_criteria():
    raw = "INCLUSION: Adults aged 18+\nCRITERIA: No cancer\n\nEXCLUSION: Pregnant women"
    cleaned = clean_criteria(raw)
    assert "INCLUSION" not in cleaned
    assert "CRITERIA" not in cleaned
    assert "\n" not in cleaned
    assert ":" not in cleaned
    assert "  " not in cleaned


def test_split_criteria_found():
    text = "Adults over 18 EXCLUSION No history of liver disease"
    inclusion, exclusion = split_criteria(text)
    assert "Adults over 18" in inclusion
    assert "No history" in exclusion


def test_split_criteria_not_found():
    text = "All subjects must fast 8 hours"
    inclusion, exclusion = split_criteria(text)
    assert inclusion == text
    assert exclusion == "No exclusion criteria found."


def test_clean_and_join_diseases():
    diseases = [" Diabetes  ", "[Cancer]", "  Asthma "]
    output = clean_and_join_diseases(diseases)
    assert output == "Diabetes, Cancer, Asthma"


def test_preprocess_trial_full_case():
    parsed = {
        "sponsor": "Moderna",
        "brief_summary": "Study of new mRNA vaccine.",
        "eligibility": "Inclusion: Adults. Exclusion: Pregnant women.",
        "diseases": ["Influenza"],
        "phase": "Phase 1"
    }

    result = preprocess_trial(parsed)

    assert result["sponsor"] == "Moderna"
    assert result["description"] == "Study of new mRNA vaccine."
    assert "Adults" in result["inclusion_criteria"]
    assert "Pregnant" in result["exclusion_criteria"]
    assert result["diseases"] == "Influenza"
    assert result["phase"] == "phase 1"