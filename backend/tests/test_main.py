import pytest
from unittest.mock import patch, MagicMock, ANY

# Mark all tests in this file as asyncio
pytestmark = pytest.mark.asyncio

# --- Mock Data ---
fake_api_response = {
    "protocolSection": {
        "sponsorCollaboratorsModule": {"leadSponsor": {"name": "Test Pharma"}},
        "descriptionModule": {"briefSummary": "Study description"},
        "eligibilityModule": {"eligibilityCriteria": "Inclusion: A. Exclusion: B."},
        "conditionsModule": {"conditions": ["Cancer"]},
        "designModule": {"phases": ["Phase 1"], "enrollmentInfo": {"count": "100"}},
        "identificationModule": {"briefTitle": "Test Title"},
        "statusModule": {"overallStatus": "RECRUITING", "completionDateStruct": {"date": "2025-12-31"}}
    },
    "hasResults": True
}
fake_predictor_response = {
    "probability": 0.87, "uncertainty": 0.04, "label": 1, "deterministic": 0.84
}
fake_cached_json = '{"nctid": "NCT00000172", "probability": 0.99, "uncertainty": 0.01, "label": 1, "deterministic": 0.98}'
fake_cached_finance_json = '{"ticker": "PFE", "metadata": {"marketCap": 999}}'

# --- Tests ---

async def test_predict_cache_miss(async_client, mock_redis):
    """
    Test a /predict request that is NOT in the cache.
    We mock run_in_threadpool to return a cache miss, then the predictor result.
    """
    with patch("app.main.fetch_nctid_data_async", return_value=fake_api_response) as mock_fetch:
        # 1. run_in_threadpool(redis_client.get, ...) -> returns None (cache miss)
        # 2. run_in_threadpool(predictor.predict, ...) -> returns predictor result
        # 3. run_in_threadpool(redis_client.set, ...) -> returns None
        with patch("app.main.run_in_threadpool", side_effect=[None, fake_predictor_response, None]) as mock_threadpool:
            
            response = await async_client.get("/predict/NCT00000172")

            assert response.status_code == 200
            data = response.json()
            assert data["probability"] == 0.87
            
            # Check call counts
            assert mock_threadpool.call_count == 3
            mock_fetch.assert_called_once()
            
            # Check the *actual* mock_redis object from the fixture was used
            mock_redis.get.assert_called_once()
            mock_redis.set.assert_called_once()

async def test_predict_cache_hit(async_client, mock_redis):
    """
    Test a /predict request that IS in the cache.
    We mock run_in_threadpool to return the cached JSON.
    """
    with patch("app.main.fetch_nctid_data_async") as mock_fetch:
        # 1. run_in_threadpool(redis_client.get, ...) -> returns cached data
        with patch("app.main.run_in_threadpool", return_value=fake_cached_json) as mock_threadpool:
            
            response = await async_client.get("/predict/NCT00000172")

            assert response.status_code == 200
            data = response.json()
            assert data["probability"] == 0.99 # This is the key from fake_cached_json
            
            # Check that slow functions were NOT called
            mock_threadpool.assert_called_once()
            mock_fetch.assert_not_called()
            mock_redis.get.assert_called_once()
            mock_redis.set.assert_not_called()

async def test_get_stock_data_valid(async_client, mock_redis):
    """Test finance endpoint (cache MISS), mocking all yfinance calls."""
    
    # Mock the yf.Ticker object and its methods
    mock_ticker = MagicMock()
    mock_history = MagicMock(empty=False)
    # This mock is now correct: idx.date() returns a string
    mock_index_date = MagicMock()
    mock_index_date.date.return_value = "2023-01-01"
    mock_history.iterrows.return_value = [(mock_index_date, {"Close": 150.0})]
    mock_ticker.history.return_value = mock_history
    mock_ticker.info = {"marketCap": 1000000, "sector": "Healthcare"}

    # 1. redis.get -> None (cache miss)
    # 2. yf.Ticker -> mock_ticker
    # 3. .history -> mock_history
    # 4. .info -> mock_ticker.info
    # 5. redis.set -> None
    with patch("app.main.run_in_threadpool", side_effect=[
        None, mock_ticker, mock_history, mock_ticker.info, None
    ]) as mock_threadpool:
        
        response = await async_client.get("/finance/PFE?range=1mo&interval=1d")
        
        assert response.status_code == 200
        data = response.json()
        assert data["metadata"]["marketCap"] == 1000000
        assert mock_threadpool.call_count == 5 # 1 get + 3 yf + 1 set
        mock_redis.get.assert_called_once()
        mock_redis.set.assert_called_once()

async def test_get_stock_data_cache_hit(async_client, mock_redis):
    """Test finance endpoint (cache HIT)."""
    # 1. run_in_threadpool(redis_client.get, ...) -> returns cached data
    with patch("app.main.run_in_threadpool", return_value=fake_cached_finance_json) as mock_threadpool:
        
        response = await async_client.get("/finance/PFE?range=1mo&interval=1d")
        
        assert response.status_code == 200 # This should now pass
        data = response.json()
        assert data["metadata"]["marketCap"] == 999
        
        # Only the redis.get call was made
        mock_threadpool.assert_called_once()
        mock_redis.get.assert_called_once()
        mock_redis.set.assert_not_called()