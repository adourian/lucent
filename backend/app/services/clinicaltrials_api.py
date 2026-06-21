import requests
import httpx
from typing import List, Dict



async def fetch_nctid_data_async(nctid: str, client: httpx.AsyncClient):
    """
    Fetches trial data from ClinicalTrials.gov v2 API asynchronously.
    """
    base_url = f"https://clinicaltrials.gov/api/v2/studies/{nctid}"

    response = await client.get(base_url)
    response.raise_for_status()

    data = response.json()
    return data




# For dev scripts only (e.g. predict.py __main__). Not used by the API server.
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
    nctid = "NCT01236547"
    try:
        trial_data = fetch_nctid_data(nctid)
        print(trial_data)
    except Exception as e:
        print(f"Error fetching data: {e}")
