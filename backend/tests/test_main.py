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
# Predictor result
fake_predictor_response = {
    "probability": 0.87, "uncertainty": 0.04, "label": 1, "deterministic": 0.84
}
# Full JSON string for Cache HIT on /predict (must match endpoint structure)
fake_cached_json = '{"nctid": "NCT00000172", "phase": "Phase 1", "sponsor": "Test Pharma", "title": "Test Title", "status": "RECRUITING", "diseases": "Cancer", "enrollment": "100", "completion_date": "2025-12-31", "probability": 0.99, "uncertainty": 0.01, "label": 1, "deterministic": 0.98}'
# Full JSON string for Cache HIT on /finance
fake_cached_finance_json = '{"ticker": "PFE", "range": "1mo", "interval": "1d", "prices": [{"date": "2023-01-01", "close": 99.99}], "metadata": {"marketCap": 999}}'

# --- Tests ---

async def test_predict_cache_miss(async_client, mock_redis):
    """
    Test a /predict request that is NOT in the cache.
    Sequence: redis.get (None), predictor.predict (data), redis.set (None).
    """
    with patch("app.main.fetch_nctid_data_async", return_value=fake_api_response) as mock_fetch:
        # run_in_threadpool calls: 1. get -> None, 2. predictor.predict -> data, 3. set -> None
        with patch("app.main.run_in_threadpool", side_effect=[None, fake_predictor_response, None]) as mock_threadpool:
            
            response = await async_client.get("/predict/NCT00000172")

            assert response.status_code == 200
            data = response.json()
            assert data["probability"] == 0.87
            assert data["title"] == "Test Title" 
            
            assert mock_threadpool.call_count == 3
            mock_fetch.assert_called_once_with("NCT00000172")
            mock_redis.get.assert_called_once()
            mock_redis.set.assert_called_once()

async def test_predict_cache_hit(async_client, mock_redis):
    """
    Test a /predict request that IS in the cache.
    Sequence: redis.get (cached JSON string). Should stop immediately.
    """
    with patch("app.main.fetch_nctid_data_async") as mock_fetch:
        # run_in_threadpool calls: 1. get -> fake_cached_json
        with patch("app.main.run_in_threadpool", return_value=fake_cached_json) as mock_threadpool:
            
            response = await async_client.get("/predict/NCT00000172")

            assert response.status_code == 200
            data = response.json()
            assert data["probability"] == 0.99
            assert data["title"] == "Test Title"
            
            # Only the redis.get call should run
            assert mock_threadpool.call_count == 1
            mock_fetch.assert_not_called()
            mock_redis.set.assert_not_called()

async def test_get_stock_data_valid(async_client, mock_redis):
    """Test finance endpoint (cache MISS). Ensures the logic flows correctly and is cached."""
    
    # Mock objects needed for yfinance logic flow
    mock_ticker = MagicMock()
    mock_history = MagicMock(empty=False)
    mock_index_date = MagicMock()
    mock_index_date.date.return_value = "2023-01-01"
    mock_history.iterrows.return_value = [(mock_index_date, {"Close": 150.0})]
    mock_ticker.history.return_value = mock_history
    mock_ticker.info = {"marketCap": 1000000, "sector": "Healthcare"}

    # Side effect sequence for run_in_threadpool:
    # 1. redis.get -> None (Cache Miss)
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
        mock_redis.set.assert_called_once()

async def test_get_stock_data_cache_hit(async_client, mock_redis):
    """Test finance endpoint (cache HIT)."""
    # 1. run_in_threadpool(redis_client.get, ...) -> returns cached data
    with patch("app.main.run_in_threadpool", return_value=fake_cached_finance_json) as mock_threadpool:
        
        response = await async_client.get("/finance/PFE?range=1mo&interval=1d")
        
        assert response.status_code == 200
        data = response.json()
        assert data["metadata"]["marketCap"] == 999
        
        # Only the redis.get call was made
        assert mock_threadpool.call_count == 1
        mock_redis.set.assert_not_called()