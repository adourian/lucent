import requests
from typing import List, Dict


def fetch_nctid_data(nctid: str):
    """
    Fetches trial data from ClinicalTrials.gov v2 API given an NCTID.

    Args:
        nctid (str): The NCTID of the clinical trial.

    Returns:
        dict: JSON data for the specified trial.

    Raises:
        Exception: If the API request fails or returns a non-200 status.
    """
    base_url = f"https://clinicaltrials.gov/api/v2/studies/{nctid}"
    
    response = requests.get(base_url)
    if response.status_code != 200:
        raise Exception(f"ClinicalTrials.gov API returned status {response.status_code}")
    data = response.json()
    return data

if __name__ == "__main__":
    # Example usage
    nctid = "NCT00000172"
    try:
        trial_data = fetch_nctid_data(nctid)
        print(trial_data)
    except Exception as e:
        print(f"Error fetching data: {e}")
