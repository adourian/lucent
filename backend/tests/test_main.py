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
    4. Call redis.set (to store the result)
    """
    # 1. Setup mocks
    mock_redis.get.return_value = None  # <-- Cache MISS

    # We patch the functions *where they are imported* (i.e., in app.main)
    with patch("app.main.fetch_nctid_data_async", return_value=fake_api_response) as mock_fetch:
        with patch("app.main.run_in_threadpool", side_effect=[fake_predictor_response, None]) as mock_threadpool:
            
            # 2. Run test
            response = await async_client.get("/predict/NCT00000172")

            # 3. Assert
            assert response.status_code == 200
            data = response.json()
            assert data["nctid"] == "NCT00000172"
            assert data["probability"] == 0.87
            
            # Check that all the correct functions were called
            mock_redis.get.assert_called_once()
            mock_fetch.assert_called_once_with("NCT00000172")
            # First call to threadpool is the predictor
            mock_threadpool.assert_any_call(
                fake_predictor_response.__self__, # This gets complex, simpler to just check count
                prepped_data, # This part is hard to mock, let's simplify
            )
            assert mock_threadpool.call_count == 2 # 1 for predictor, 1 for redis.set
            mock_redis.set.assert_called_once() # Cache was set

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
            mock_redis.get.assert_called_once()
            mock_fetch.assert_not_called()
            mock_threadpool.assert_not_called() # Neither predictor nor redis.set
            mock_redis.set.assert_not_called()

async def test_get_stock_data_valid(async_client, mock_redis):
    """Test finance endpoint (cache MISS), mocking all yfinance calls."""
    mock_redis.get.return_value = None # Cache miss

    # Mock the yf.Ticker object and its methods
    mock_ticker = MagicMock()
    # Create a simple DataFrame-like object to mock iterrows
    mock_history = MagicMock(empty=False)
    mock_history.iterrows.return_value = [
        (MagicMock(date="2023-01-01"), {"Close": 150.0})
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