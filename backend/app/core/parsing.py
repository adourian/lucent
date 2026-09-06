

def parse_trial_json(data: dict):
    protocol = data.get('protocolSection', {})

    sponsor = protocol.get('sponsorCollaboratorsModule', {}).get('leadSponsor', {}).get('name', "")
    has_results = data.get('hasResults', False)
    brief_summary = protocol.get('descriptionModule', {}).get('briefSummary', "")
    eligibility = protocol.get('eligibilityModule', {}).get('eligibilityCriteria', "")
    diseases = protocol.get('conditionsModule', {}).get('conditions', [])
    # Preserve every phase for training-contract normalization downstream.
    phase = protocol.get('designModule', {}).get('phases')

    # ✅ Additions
    title = protocol.get('identificationModule', {}).get('briefTitle', "")
    status = protocol.get('statusModule', {}).get('overallStatus', "")
    enrollment = protocol.get('designModule', {}).get('enrollment', {}).get('count', "")
    if not enrollment or enrollment == "NA":
        enrollment = protocol.get('designModule', {}).get('enrollmentInfo', {}).get('count', "")
    completion_date = protocol.get('statusModule', {}).get('completionDateStruct', {}).get('date', "")

    return {
        "sponsor": sponsor,
        "has_results": has_results,
        "brief_summary": brief_summary,
        "eligibility": eligibility,
        "diseases": diseases,
        "phase": phase,
        "study_type": protocol.get('designModule', {}).get('studyType', ""),
        "title": title,
        "status": status,
        "enrollment": enrollment,
        "completion_date": completion_date
    }

if __name__ == "__main__":
    from app.services.clinicaltrials_api import fetch_nctid_data
    nctid = "NCT00000897"
    try:
        trial_data = fetch_nctid_data(nctid)
        parsed_trial = parse_trial_json(trial_data)
        print(parsed_trial)
    except Exception as e:
        print(f"Error fetching or parsing data: {e}")
