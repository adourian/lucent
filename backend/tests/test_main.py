import pytest
from unittest.mock import patch, MagicMock

# Mark all tests in this file as asyncio
pytestmark = pytest.mark.asyncio

# --- Mock Data ---

# Mock response from clinicaltrials.gov API
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

# Mock response from our ML model predictor
fake_predictor_response = {
    "probability": 0.87,
    "uncertainty": 0.04,
    "label": 1,
    "deterministic": 0.84
}

# --- Tests ---

async def test_predict_cache_miss(async_client, mock_redis):
    """
    Test a /predict request that is NOT in the cache.
    It should:
    1. Call redis.get (and find nothing)
    2. Call fetch_nctid_data_async
    3. Call run_in_threadpool (for the predictor)
    4. Call run_in_threadpool (for redis.set)
    """
    # 1. Setup mocks
    mock_redis.get.return_value = None  # <-- Cache MISS

    with patch("app.main.fetch_nctid_data_async", return_value=fake_api_response) as mock_fetch:
        # We mock the threadpool to return the predictor response, then None (for the redis.set)
        with patch("app.main.run_in_threadpool", side_effect=[fake_predictor_response, None]) as mock_threadpool:
            
            # 2. Run test
            response = await async_client.get("/predict/NCT00000172")

            # 3. Assert
            assert response.status_code == 200
            data = response.json()
            assert data["nctid"] == "NCT00000172"
            assert data["probability"] == 0.87
            
            # Check that all the correct functions were called
            # We assume ENV is 'development' which is the default in the code
            mock_redis.get.assert_called_once_with("nctid:development:NCT00000172")
            mock_fetch.assert_called_once_with("NCT00000172")
            
            # Check that threadpool was called twice:
            # 1. For the predictor
            # 2. For the redis.set
            assert mock_threadpool.call_count == 2
            
            # We can also check that redis.set itself (which runs IN the threadpool) was called
            mock_redis.set.assert_called_once()


async def test_predict_cache_hit(async_client, mock_redis):
    """
    Test a /predict request that IS in the cache.
    It should:
    1. Call redis.get (and find data)
    2. NOT call fetch_nctid_data_async
    3. NOT call run_in_threadpool
    4. NOT call redis.set
    """
    # 1. Setup mocks
    fake_cached_json = '{"nctid": "NCT00000172", "probability": 0.99, "uncertainty": 0.01, "label": 1, "deterministic": 0.98}'
    mock_redis.get.return_value = fake_cached_json # <-- Cache HIT

    with patch("app.main.fetch_nctid_data_async") as mock_fetch:
        with patch("app.main.run_in_threadpool") as mock_threadpool:
            
            # 2. Run test
            response = await async_client.get("/predict/NCT00000172")

            # 3. Assert
            assert response.status_code == 200
            assert response.json()["probability"] == 0.99
            
            # Check that slow functions were NOT called
            mock_redis.get.assert_called_once() # get *was* called
            mock_fetch.assert_not_called()
            mock_threadpool.assert_not_called() # The slow calls were not made
            mock_redis.set.assert_not_called()  # set was not called

async def test_get_stock_data_valid(async_client, mock_redis):
    """Test finance endpoint (cache MISS), mocking all yfinance calls."""
    mock_redis.get.return_value = None # Cache miss

    # Mock the yf.Ticker object and its methods
    mock_ticker = MagicMock()
    # Create a simple DataFrame-like object to mock iterrows
    mock_history = MagicMock(empty=False)
    # Mock the date() method on the index
    mock_index_date = MagicMock()
    mock_index_date.date.return_value = "2023-01-01"
    
    mock_history.iterrows.return_value = [
        (mock_index_date, {"Close": 150.0})
    ]
    mock_ticker.history.return_value = mock_history
    mock_ticker.info = {"marketCap": 1000000, "sector": "Healthcare"}

    with patch("app.main.run_in_threadpool") as mock_threadpool:
        # Make threadpool return our mock objects in the order they are called
        mock_threadpool.side_effect = [
            mock_ticker,          # 1st call: yf.Ticker(ticker)
            mock_history,         # 2nd call: ticker_obj.history(...)
            mock_ticker.info,     # 3rd call: getattr(ticker_obj, 'info')
            None                  # 4th call: redis.set(...)
        ]
        
        response = await async_client.get("/finance/PFE?range=1mo&interval=1d")
        
        assert response.status_code == 200
        data = response.json()
        assert data["ticker"] == "PFE"
        assert data["metadata"]["marketCap"] == 1000000
        assert data["prices"][0]["date"] == "2023-01-01"
        assert mock_threadpool.call_count == 4
        mock_redis.set.assert_called_once() # Check that it cached the result

async def test_get_stock_data_cache_hit(async_client, mock_redis):
    """Test finance endpoint (cache HIT)."""
    fake_cached_json = '{"ticker": "PFE", "metadata": {"marketCap": 999}}'
    mock_redis.get.return_value = fake_cached_json # <-- Cache HIT

    with patch("app.main.run_in_threadpool") as mock_threadpool:
        response = await async_client.get("/finance/PFE?range=1mo&interval=1d")
        
        assert response.status_code == 200
        data = response.json()
        assert data["metadata"]["marketCap"] == 999
        mock_threadpool.assert_not_called() # yfinance was NOT called
        mock_redis.set.assert_not_called()  # redis.set was NOT called