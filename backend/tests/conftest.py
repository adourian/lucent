import pytest
import pytest_asyncio
from unittest.mock import MagicMock, patch
from httpx import AsyncClient, ASGITransport

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import app, redis_client  # Import the real redis_client

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for our test session."""
    import asyncio
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest_asyncio.fixture(scope="function")
async def async_client():
    """Fixture for an async test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

@pytest.fixture(scope="function")
def mock_redis():
    """Fixture to mock the redis_client."""
    # We mock the *instance* that main.py imported
    app.redis_client = MagicMock()
    yield app.redis_client
    # Reset it after the test
    app.redis_client = redis_client

@pytest.fixture(autouse=True)
def mock_helpers():
    # We must patch these synchronous functions to return clean, expected data
    fake_prepped_data = {
        "nctid": "NCT00000172", "phase": "phase 1", "sponsor": "Test Pharma",
        "title": "Test Title", "status": "RECRUITING", "diseases": "Cancer",
        "enrollment": "100", "completion_date": "2025-12-31"
    }
    with patch("app.main.parse_trial_json", return_value={"mocked": True}) as mock_parse, \
         patch("app.main.preprocess_trial", return_value=fake_prepped_data) as mock_prep:
        yield mock_parse, mock_prep