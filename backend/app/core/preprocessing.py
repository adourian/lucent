import re
from typing import Dict, Any

def normalize_phase(phase_raw: str) -> str:
    """
    Normalize clinical phase strings to standard format used in training.
    """
    mapping = {
        "earlyphase1": "early phase 1",
        "phase1": "phase 1",
        "phase1/phase2": "phase 1/phase 2",
        "phase2": "phase 2",
        "phase2/phase3": "phase 2/phase 3",
        "phase3": "phase 3",
        "phase4": "phase 4"
    }
    if not phase_raw:
        return "na"
    # Remove spaces and dashes, lowercase
    key = phase_raw.replace(" ", "").replace("-", "").lower()
    return mapping.get(key, phase_raw.lower())

def clean_criteria(text: str) -> str:
    """
    Cleans and normalizes eligibility criteria text.
    """
    if not text:
        return ""
    text = text.replace('\r', '').replace('\n', ' ').replace(':', ' ')
    for w in ['Inclusion', 'inclusion', 'INCLUSION', 'Criteria', 'criteria', 'CRITERIA']:
        text = text.replace(w, '')
    text = re.sub(r'\s{2,}', ' ', text)
    return text.strip()

def split_criteria(text: str) -> (str, str):
    """
    Splits criteria text into inclusion and exclusion criteria.
    """
    for exclusion_word in ['Exclusion', 'EXCLUSION']:
        if exclusion_word in text:
            inclusion, exclusion = text.split(exclusion_word, 1)
            return inclusion.strip(), exclusion.strip()
    return text.strip(), 'No exclusion criteria found.'

def clean_and_join_diseases(diseases) -> str:
    """
    Cleans a list of disease strings and joins with a comma.
    Returns a single string.
    """
    if not diseases:
        return ''
    cleaned = [d.replace('[', '').replace(']', '').replace("'", '').strip() for d in diseases]
    cleaned = [re.sub(r'\s{2,}', ' ', d) for d in cleaned if d]
    return ', '.join(cleaned)

def preprocess_trial(
    parsed_trial: Dict[str, Any], 
) -> Dict[str, Any]:
    """
    Prepares parsed trial data for model inference.
    Args:
        parsed_trial (dict): Output from parse_trial_json
    Returns:
        dict: ready-to-infer fields
    """
    # Phase normalization
    phase_norm = normalize_phase(parsed_trial.get("phase", ""))

    # Description and eligibility cleaning/splitting
    description = parsed_trial.get("brief_summary", "")
    criteria_raw = clean_criteria(parsed_trial.get("eligibility", ""))
    inclusion, exclusion = split_criteria(criteria_raw)

    # Diseases: flatten to comma-separated string
    diseases_flat = clean_and_join_diseases(parsed_trial.get("diseases", []))

    # Output dictionary
    return {
        "sponsor": parsed_trial.get("sponsor", ""),
        "description": description.strip(),
        "inclusion_criteria": inclusion,
        "exclusion_criteria": exclusion,
        "diseases": diseases_flat,
        "phase": phase_norm
    }

# Example usage (requires correct import paths and supporting code):
if __name__ == "__main__":
    from app.core.parsing import parse_trial_json
    from app.services.clinicaltrials_api import fetch_nctid_data

    parsed = parse_trial_json(fetch_nctid_data("NCT06056323"))
    result = preprocess_trial(parsed)
    print(result)