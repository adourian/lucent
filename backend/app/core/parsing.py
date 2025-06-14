

def parse_trial_json(data: dict):
    """
    Extract relevant fields from ClinicalTrials.gov v2 study JSON for preprocessing.
    """
    protocol = data.get('protocolSection', {})

    # 1. Sponsor
    sponsor = protocol.get('sponsorCollaboratorsModule', {}).get('leadSponsor', {}).get('name', "")

    # 2. Has results
    has_results = data.get('hasResults', False)

    # 3. Brief summary
    brief_summary = protocol.get('descriptionModule', {}).get('briefSummary', "")

    # 4. Eligibility criteria
    eligibility = protocol.get('eligibilityModule', {}).get('eligibilityCriteria', "")

    # 5. Diseases/conditions
    diseases = protocol.get('conditionsModule', {}).get('conditions', [])

    # 6. Clinical phase
    phase_list = protocol.get('designModule', {}).get('phases', [])
    phase = phase_list[0] if phase_list else "NA"

    return {
        "sponsor": sponsor,
        "has_results": has_results,
        "brief_summary": brief_summary,
        "eligibility": eligibility,
        "diseases": diseases,
        "phase": phase
    }

if __name__ == "__main__":
    from app.services.clinicaltrials_api import fetch_nctid_data
    nctid = "NCT06056323"  # Example NCTID
    try:
        trial_data = fetch_nctid_data(nctid)
        parsed_trial = parse_trial_json(trial_data)
        print(parsed_trial)
    except Exception as e:
        print(f"Error fetching or parsing data: {e}")