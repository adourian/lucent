import pytest
from unittest.mock import patch, MagicMock, ANY

# Mark all tests in this file as asyncio
pytestmark = pytest.mark.asyncio

# --- Mock Data ---

# NOTE: The fake_api_response is not needed here if mock_helpers is autouse=True
# because the fetching is fully isolated.

fake_predictor_result = {
    "probability": 0.87, "uncertainty": 0.04, "label": 1, "deterministic": 0.84
}

fake_cached_predict_json = '{"nctid": "NCT00000172", "phase": "phase 1", "sponsor": "Test Pharma", "title": "Test Title", "status": "RECRUITING", "diseases": "Cancer", "enrollment": "100", "completion_date": "2025-12-31", "probability": 0.99, "uncertainty": 0.01, "label": 1, "deterministic": 0.98}'

fake_cached_finance_json = '{"ticker": "PFE", "range": "1mo", "interval": "1d", "prices": [{"date": "2023-01-01", "close": 99.99}], "metadata": {"marketCap": 999, "sector": "Healthcare"}}'

fake_yfinance_result = {"ticker": "PFE", "range": "1mo", "interval": "1d", "prices": [{"date": "2023-11-01", "close": 100.00}], "metadata": {"marketCap": 1000000, "sector": "Healthcare"}}


# --- Tests ---

async def test_predict_cache_miss(async_client, mock_redis):
    """
    Test a cache MISS. Ensures API calls are made and cache is set.
    """
    # The API response doesn't matter here, only that the call is mocked.
    with patch("app.main.fetch_nctid_data_async", return_value={}) as mock_fetch:
        # Side effect sequence for run_in_threadpool:
        # 1. redis.get -> None (Cache Miss)
        # 2. predictor.predict -> fake_predictor_result
        # 3. redis.set -> None
        with patch("app.main.run_in_threadpool", side_effect=[None, fake_predictor_result, None]) as mock_threadpool:
            
            response = await async_client.get("/predict/NCT00000172")

            assert response.status_code == 200
            data = response.json()
            
            # This assert confirms the mock was successful and the response structure is correct
            assert data["probability"] == 0.87
            assert data["title"] == "Test Title" 
            
            assert mock_threadpool.call_count == 3
            mock_fetch.assert_called_once()
            mock_redis.get.assert_called_once()
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
            
            # Assert that slow calls were not made
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