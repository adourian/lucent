from __future__ import annotations

import os
import sys

from starlette.requests import Request

# Keep this test importable when CI invokes ``pytest`` from the backend
# working directory without installing the application as a package.
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.analytics import UsageEvent, is_monitor_request, request_nctid


def make_request(path: str, headers: dict[str, str] | None = None) -> Request:
    raw_headers = [
        (key.lower().encode(), value.encode())
        for key, value in (headers or {}).items()
    ]
    return Request(
        {
            "type": "http",
            "method": "GET",
            "path": path,
            "headers": raw_headers,
        }
    )


def test_usage_event_only_accepts_known_shape() -> None:
    event = UsageEvent(
        event="analysis_succeeded",
        client_id="client-1234567890",
        session_id="session-1234567890",
        nctid="nct05822830",
        route="/",
        viewport="desktop",
    )

    assert event.nctid == "nct05822830"
    assert event.event == "analysis_succeeded"


def test_uptime_robot_is_separated_by_user_agent_and_probe_id(monkeypatch) -> None:
    monkeypatch.setenv("UPTIME_MONITOR_NCTID", "NCT05822830")
    request = make_request(
        "/predict/NCT05822830",
        {"user-agent": "UptimeRobot/2.0"},
    )

    assert request_nctid(request) == "NCT05822830"
    assert is_monitor_request(request, "NCT05822830") is True
    assert is_monitor_request(request, "NCT04136171") is False


def test_uptime_robot_token_is_preferred_for_existing_monitor(monkeypatch) -> None:
    monkeypatch.setenv("UPTIME_MONITOR_TOKEN", "test-monitor-token")
    request = make_request(
        "/predict/NCT05822830",
        {"x-lucent-monitor-token": "test-monitor-token"},
    )

    assert is_monitor_request(request, "NCT05822830") is True
