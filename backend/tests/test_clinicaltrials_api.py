import pytest
import respx
import httpx

import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.clinicaltrials_api import fetch_nctid_data_async

# Mark all tests in this file as asyncio
pytestmark = pytest.mark.asyncio

@respx.mock
async def test_fetch_nctid_data_async_success():
    """Test successful API call using httpx and respx."""
    nctid = "NCT00000172"
    expected_url = f"https://clinicaltrials.gov/api/v2/studies/{nctid}"
    dummy_response = {"protocolSection": {"someField": "someValue"}}

    # Mock the GET request
    respx.get(expected_url).mock(return_value=httpx.Response(200, json=dummy_response))

    result = await fetch_nctid_data_async(nctid)
    
    assert result == dummy_response
    assert respx.get(expected_url).called

@respx.mock
async def test_fetch_nctid_data_async_failure():
    """Test a 404 API failure."""
    nctid = "INVALID_ID"
    expected_url = f"https://clinicaltrials.gov/api/v2/studies/{nctid}"

    # Mock the GET request to return a 404
    respx.get(expected_url).mock(return_value=httpx.Response(404))

    with pytest.raises(Exception, match="ClinicalTrials.gov API returned status 404"):
        await fetch_nctid_data_async(nctid)