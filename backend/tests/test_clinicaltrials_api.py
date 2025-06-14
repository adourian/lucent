import pytest
from unittest.mock import patch, MagicMock

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.clinicaltrials_api import fetch_nctid_data


def test_fetch_nctid_data_success():
    dummy_response = {"protocolSection": {"someField": "someValue"}}

    with patch("app.services.clinicaltrials_api.requests.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = dummy_response
        mock_get.return_value = mock_resp

        result = fetch_nctid_data("NCT00000172")
        assert result == dummy_response
        mock_get.assert_called_once()


def test_fetch_nctid_data_failure():
    with patch("app.services.clinicaltrials_api.requests.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.status_code = 404
        mock_get.return_value = mock_resp

        with pytest.raises(Exception, match="ClinicalTrials.gov API returned status 404"):
            fetch_nctid_data("INVALID_ID")