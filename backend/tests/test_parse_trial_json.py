import pytest

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))


from backend.app.core.parsing import parse_trial_json  # Adjust to your actual import path


def test_parse_trial_json_full_fields():
    sample_input = {
        "protocolSection": {
            "sponsorCollaboratorsModule": {
                "leadSponsor": {"name": "Pfizer"}
            },
            "descriptionModule": {
                "briefSummary": "This is a study summary."
            },
            "eligibilityModule": {
                "eligibilityCriteria": "Inclusion: Adults. Exclusion: Pregnant women."
            },
            "conditionsModule": {
                "conditions": ["Diabetes", "Hypertension"]
            },
            "designModule": {
                "phases": ["Phase 2"]
            }
        },
        "hasResults": True
    }

    parsed = parse_trial_json(sample_input)

    assert parsed["sponsor"] == "Pfizer"
    assert parsed["has_results"] is True
    assert parsed["brief_summary"] == "This is a study summary."
    assert parsed["eligibility"] == "Inclusion: Adults. Exclusion: Pregnant women."
    assert parsed["diseases"] == ["Diabetes", "Hypertension"]
    assert parsed["phase"] == "Phase 2"


def test_parse_trial_json_missing_fields():
    parsed = parse_trial_json({})  # Empty dict

    assert parsed["sponsor"] == ""
    assert parsed["has_results"] is False
    assert parsed["brief_summary"] == ""
    assert parsed["eligibility"] == ""
    assert parsed["diseases"] == []
    assert parsed["phase"] == "NA"