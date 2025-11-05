import pytest
from unittest.mock import patch, MagicMock, ANY

# Mark all tests in this file as asyncio
pytestmark = pytest.mark.asyncio

# --- Mock Data ---

# Mock response from external API call (fetch_nctid_data_async)
fake_api_response = {"protocolSection": {"designModule": {"phases": ["Phase 1"]}}}

# Mock response from internal parsing/preprocessing steps
fake_prepped_data = {
    "nctid": "NCT00000172", "phase": "phase 1", "sponsor": "Test Pharma",
    "title": "Test Title", "status": "RECRUITING", "diseases": "Cancer",
    "enrollment": "100", "completion_date": "2025-12-31"
}

# Mock result from predictor.predict_with_uncertainty
fake_predictor_result = {
    "probability": 0.87, "uncertainty": 0.04, "label": 1, "deterministic": 0.84
}

# Full expected JSON structure for a successful prediction
fake_full_success_response = {**fake_prepped_data, **fake_predictor_result}
fake_cached_predict_json = '{"nctid": "NCT00000172", "phase": "phase 1", "sponsor": "Test Pharma", "title": "Test Title", "status": "RECRUITING", "diseases": "Cancer", "enrollment": "100", "completion_date": "2025-12-31", "probability": 0.99, "uncertainty": 0.01, "label": 1, "deterministic": 0.98}'

# Finance Mock Data
fake_cached_finance_json = '{"ticker": "PFE", "range": "1mo", "interval": "1d", "prices": [], "metadata": {"marketCap": 999}}'
# This mock represents the combined output of all yfinance steps
fake_yfinance_result = {"ticker": "PFE", "range": "1mo", "interval": "1d", "prices": [], "metadata": {"marketCap": 1000000}}


# --- Patch targets for helper functions (Isolate the API from ML logic) ---
@pytest.fixture(autouse=True)
def mock_helpers():
    with patch("app.main.parse_trial_json", return_value={"mocked": True}) as mock_parse, \
         patch("app.main.preprocess_trial", return_value=fake_prepped_data) as mock_prep:
        yield mock_parse, mock_prep

# --- Tests ---

async def test_predict_cache_miss(async_client, mock_redis):
    """
    Test a cache MISS. Ensures API calls are made and cache is set.
    """
    with patch("app.main.fetch_nctid_data_async", return_value=fake_api_response) as mock_fetch:
        # Side effect sequence for run_in_threadpool:
        # 1. redis.get -> None (Cache Miss)
        # 2. predictor.predict_with_uncertainty -> fake_predictor_result
        # 3. redis.set -> None
        with patch("app.main.run_in_threadpool", side_effect=[None, fake_predictor_result, None]) as mock_threadpool:
            
            response = await async_client.get("/predict/NCT00000172")

            assert response.status_code == 200
            data = response.json()
            
            # Assert against the final expected structure
            assert data["probability"] == 0.87
            assert data["title"] == "Test Title" 
            
            # Assert calls
            mock_fetch.assert_called_once_with("NCT00000172")
            assert mock_threadpool.call_count == 3
            mock_redis.set.assert_called_once()


async def test_predict_cache_hit(async_client, mock_redis):
    """
    Test a cache HIT. Ensures prediction logic is skipped.
    """
    with patch("app.main.fetch_nctid_data_async") as mock_fetch:
        # run_in_threadpool calls: 1. get -> fake_cached_predict_json
        with patch("app.main.run_in_threadpool", return_value=fake_cached_predict_json) as mock_threadpool:
            
            response = await async_client.get("/predict/NCT00000172")

            assert response.status_code == 200
            data = response.json()
            
            # Assert data is from cache
            assert data["probability"] == 0.99
            
            # Assert that no slow calls were made
            assert mock_threadpool.call_count == 1
            mock_fetch.assert_not_called()
            mock_redis.set.assert_not_called()


async def test_get_stock_data_valid(async_client, mock_redis):
    """
    Test finance endpoint (cache MISS). Mocking the combined yfinance logic.
    """
    # Side effect sequence for run_in_threadpool:
    # 1. redis.get -> None (Cache Miss)
    # 2. All yfinance logic (Ticker, history, info) -> fake_yfinance_result
    # 3. redis.set -> None
    with patch("app.main.run_in_threadpool", side_effect=[
        None, fake_yfinance_result, None
    ]) as mock_threadpool:
        
        response = await async_client.get("/finance/PFE?range=1mo&interval=1d")
        
        assert response.status_code == 200 # Should now pass, no 500 error
        data = response.json()
        
        assert data["metadata"]["marketCap"] == 1000000
        assert mock_threadpool.call_count == 3 # 1 get + 1 big logic + 1 set
        mock_redis.set.assert_called_once()

async def test_get_stock_data_cache_hit(async_client, mock_redis):
    """Test finance endpoint (cache HIT)."""
    # 1. run_in_threadpool(redis_client.get, ...) -> returns cached data
    with patch("app.main.run_in_threadpool", return_value=fake_cached_finance_json) as mock_threadpool:
        
        response = await async_client.get("/finance/PFE?range=1mo&interval=1d")
        
        assert response.status_code == 200 # Should now pass
        data = response.json()
        
        assert data["metadata"]["marketCap"] == 999
        
        # Only the redis.get call was made
        assert mock_threadpool.call_count == 1
        mock_redis.set.assert_not_called()