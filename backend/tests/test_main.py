import pytest
from unittest.mock import patch, MagicMock, ANY

# Mark all tests in this file as asyncio
pytestmark = pytest.mark.asyncio

# --- Mock Data (Ensures every test has the expected output structure) ---
# NOTE: The mock_helpers fixture in conftest.py must be applied for these to work.
fake_prepped_data = {
    "nctid": "NCT00000172", "phase": "phase 1", "sponsor": "Test Pharma",
    "title": "Test Title", "status": "RECRUITING", "diseases": "Cancer",
    "enrollment": "100", "completion_date": "2025-12-31"
}

fake_predictor_result = {
    "probability": 0.87, "uncertainty": 0.04, "label": 1, "deterministic": 0.84
}

# The expected full success JSON response
fake_full_predict_response = {**fake_prepped_data, **fake_predictor_result}

# Full JSON string for Cache HIT on /predict
fake_cached_predict_json = '{"nctid": "NCT00000172", "phase": "phase 1", "sponsor": "Test Pharma", "title": "Test Title", "status": "RECRUITING", "diseases": "Cancer", "enrollment": "100", "completion_date": "2025-12-31", "probability": 0.99, "uncertainty": 0.01, "label": 1, "deterministic": 0.98}'

# Full JSON string for Cache HIT on /finance
fake_cached_finance_json = '{"ticker": "PFE", "range": "1mo", "interval": "1d", "prices": [{"date": "2023-01-01", "close": 99.99}], "metadata": {"marketCap": 999, "sector": "Healthcare"}}'

# This mock represents the combined, successful output of the yfinance logic
fake_yfinance_result = {"ticker": "PFE", "range": "1mo", "interval": "1d", "prices": [{"date": "2023-11-01", "close": 100.00}], "metadata": {"marketCap": 1000000, "sector": "Healthcare"}}


# --- Tests ---

async def test_predict_cache_miss(async_client, mock_redis):
    """
    Test a cache MISS. We mock ALL heavy lifting (fetch, predict, set) to return success.
    """
    # The API response doesn't matter here, as pre-processing is mocked by autouse fixture.
    with patch("app.main.fetch_nctid_data_async", return_value={}) as mock_fetch:
        # Side effect sequence for run_in_threadpool:
        # 1. redis.get -> None (Cache Miss)
        # 2. predictor.predict -> fake_predictor_result
        # 3. redis.set -> None
        with patch("app.main.run_in_threadpool", side_effect=[None, fake_predictor_result, None]) as mock_threadpool:
            
            response = await async_client.get("/predict/NCT00000172")

            assert response.status_code == 200
            data = response.json()
            
            # Assert against the final expected structure, confirming full run
            assert data["probability"] == 0.87
            assert data["title"] == "Test Title" 
            
            assert mock_threadpool.call_count == 3
            mock_fetch.assert_called_once()
            mock_redis.set.assert_called_once()


async def test_predict_cache_hit(async_client, mock_redis):
    """
    Test a cache HIT. We mock the redis.get to return a valid JSON string.
    """
    with patch("app.main.fetch_nctid_data_async") as mock_fetch:
        # run_in_threadpool calls: 1. get -> fake_cached_predict_json
        with patch("app.main.run_in_threadpool", return_value=fake_cached_predict_json) as mock_threadpool:
            
            response = await async_client.get("/predict/NCT00000172")

            assert response.status_code == 200
            data = response.json()
            
            # Assert data is from cache
            assert data["probability"] == 0.99
            assert data["title"] == "Test Title"
            
            # Assert that no slow calls were made
            assert mock_threadpool.call_count == 1
            mock_fetch.assert_not_called()
            mock_redis.set.assert_not_called()


async def test_get_stock_data_valid(async_client, mock_redis):
    """
    Test finance endpoint (cache MISS). Mocking the combined yfinance logic
    to return a successful result, avoiding the 500 error.
    """
    # Side effect sequence for run_in_threadpool:
    # 1. redis.get -> None (Cache Miss)
    # 2. All yfinance logic -> fake_yfinance_result
    # 3. redis.set -> None
    with patch("app.main.run_in_threadpool", side_effect=[
        None, fake_yfinance_result, None
    ]) as mock_threadpool:
        
        response = await async_client.get("/finance/PFE?range=1mo&interval=1d")
        
        assert response.status_code == 200 # Must be 200 now
        data = response.json()
        
        assert data["metadata"]["marketCap"] == 1000000
        assert mock_threadpool.call_count == 3 # 1 get + 1 big logic + 1 set
        mock_redis.set.assert_called_once()

async def test_get_stock_data_cache_hit(async_client, mock_redis):
    """Test finance endpoint (cache HIT)."""
    # 1. run_in_threadpool(redis_client.get, ...) -> returns cached data
    with patch("app.main.run_in_threadpool", return_value=fake_cached_finance_json) as mock_threadpool:
        
        response = await async_client.get("/finance/PFE?range=1mo&interval=1d")
        
        assert response.status_code == 200 # Must be 200 now
        data = response.json()
        
        assert data["metadata"]["marketCap"] == 999
        
        # Only the redis.get call was made
        assert mock_threadpool.call_count == 1
        mock_redis.set.assert_not_called()
