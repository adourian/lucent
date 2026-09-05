"""Small, privacy-conscious usage telemetry helpers.

This module deliberately keeps product analytics separate from prediction
payloads and from the model cache. Redis is used as a short-lived hot store;
the write path is best-effort and should never be able to fail an inference
request.
"""

from __future__ import annotations

import asyncio
import os
import re
import secrets
from datetime import datetime, timezone
from typing import Any, Literal

from fastapi import Request
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field


NCT_ID_PATTERN = re.compile(r"^NCT\d{8}$")
UsageEventName = Literal[
    "page_view",
    "analysis_submitted",
    "analysis_succeeded",
    "analysis_failed",
    "analysis_rejected",
    "example_selected",
    "registry_link_opened",
]


class UsageEvent(BaseModel):
    """Allow-list the small set of events the web client can emit.

    We intentionally do not accept arbitrary properties, trial titles, model
    outputs, or IP addresses. The NCTID is public registry metadata and is
    retained only to understand which analyses are being used.
    """

    schema_version: Literal[1] = 1
    event: UsageEventName
    client_id: str = Field(min_length=16, max_length=128)
    session_id: str = Field(min_length=16, max_length=128)
    nctid: str | None = Field(default=None, max_length=11)
    reason: Literal["empty", "format"] | None = None
    app_version: str = Field(default="0.3.0", max_length=32)
    route: str = Field(default="/", max_length=128)
    viewport: str | None = Field(default=None, max_length=32)
    source: Literal["web"] = "web"


def _analytics_ttl_seconds() -> int:
    try:
        return max(86_400, int(os.getenv("ANALYTICS_RETENTION_SECONDS", "7776000")))
    except ValueError:
        return 7_776_000


def _stream_max_length() -> int:
    try:
        return max(1_000, int(os.getenv("ANALYTICS_STREAM_MAXLEN", "100000")))
    except ValueError:
        return 100_000


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _date_key(now: datetime) -> str:
    return now.strftime("%Y-%m-%d")


def _normalise_nctid(nctid: str | None) -> str | None:
    if not nctid:
        return None
    candidate = nctid.strip().upper()
    return candidate if NCT_ID_PATTERN.fullmatch(candidate) else None


def _request_nctid(request: Request) -> str | None:
    path_nctid = request.url.path.rstrip("/").rsplit("/", 1)[-1]
    return _normalise_nctid(path_nctid)


def is_monitor_request(request: Request, nctid: str | None = None) -> bool:
    """Identify configured uptime probes without treating an NCTID as a user.

    The most reliable option is a private ``X-Lucent-Monitor-Token`` header
    configured in the monitor and in ``UPTIME_MONITOR_TOKEN``. UptimeRobot's
    user-agent is a useful fallback for existing monitors. If
    ``UPTIME_MONITOR_NCTID`` is set, the fallback is limited to that probe
    identifier so a normal request cannot be excluded just for using the same
    trial.
    """

    expected_token = os.getenv("UPTIME_MONITOR_TOKEN", "").strip()
    provided_token = request.headers.get("x-lucent-monitor-token", "")
    if expected_token and provided_token:
        try:
            if secrets.compare_digest(provided_token, expected_token):
                return True
        except TypeError:
            pass

    user_agent = request.headers.get("user-agent", "").lower()
    if "uptimerobot" not in user_agent:
        return False

    configured_nctid = _normalise_nctid(os.getenv("UPTIME_MONITOR_NCTID"))
    return configured_nctid is None or _normalise_nctid(nctid) == configured_nctid


def _write_event_sync(redis_client: Any, environment: str, event: UsageEvent) -> None:
    now = _utc_now()
    date = _date_key(now)
    event_key = f"analytics:{environment}:events"
    counter_key = f"analytics:{environment}:daily:{date}"
    visitors_key = f"analytics:{environment}:unique:visitors:{date}"
    sessions_key = f"analytics:{environment}:unique:sessions:{date}"
    trials_key = f"analytics:{environment}:unique:nctids:{date}"
    ttl = _analytics_ttl_seconds()

    fields: dict[str, str] = {
        "schema_version": str(event.schema_version),
        "event": event.event,
        "server_at": now.isoformat(),
        "client_id": event.client_id,
        "session_id": event.session_id,
        "route": event.route,
        "app_version": event.app_version,
        "source": event.source,
    }
    if event.nctid:
        normalised_nctid = _normalise_nctid(event.nctid)
        if normalised_nctid:
            fields["nctid"] = normalised_nctid
    if event.reason:
        fields["reason"] = event.reason
    if event.viewport:
        fields["viewport"] = event.viewport

    pipeline = redis_client.pipeline(transaction=True)
    pipeline.xadd(event_key, fields, maxlen=_stream_max_length(), approximate=True)
    pipeline.expire(event_key, ttl)
    pipeline.hincrby(counter_key, f"event:{event.event}", 1)
    pipeline.pfadd(visitors_key, event.client_id)
    pipeline.pfadd(sessions_key, event.session_id)
    if "nctid" in fields:
        pipeline.pfadd(trials_key, fields["nctid"])
    pipeline.expire(counter_key, ttl)
    pipeline.expire(visitors_key, ttl)
    pipeline.expire(sessions_key, ttl)
    if "nctid" in fields:
        pipeline.expire(trials_key, ttl)
    pipeline.execute()


async def record_usage_event(redis_client: Any, environment: str, event: UsageEvent) -> None:
    """Write one event without allowing telemetry failures to reach the client."""

    if redis_client is None:
        return
    try:
        await run_in_threadpool(_write_event_sync, redis_client, environment, event)
    except Exception as exc:  # pragma: no cover - external Redis failure path
        print(f"[Analytics] event write skipped: {exc}")


def schedule_usage_event(redis_client: Any, environment: str, event: UsageEvent) -> None:
    if redis_client is None:
        return
    try:
        asyncio.create_task(record_usage_event(redis_client, environment, event))
    except RuntimeError:
        # No running event loop during shutdown/tests; telemetry is best effort.
        return


def _write_request_counter_sync(
    redis_client: Any,
    environment: str,
    *,
    monitor: bool,
    status_code: int,
) -> None:
    now = _utc_now()
    counter_key = f"analytics:{environment}:daily:{_date_key(now)}"
    ttl = _analytics_ttl_seconds()
    status_bucket = "2xx" if status_code < 300 else "4xx" if status_code < 500 else "5xx"
    prefix = "monitor" if monitor else "product"

    pipeline = redis_client.pipeline(transaction=True)
    pipeline.hincrby(counter_key, f"{prefix}:predict_requests", 1)
    pipeline.hincrby(counter_key, f"{prefix}:predict_{status_bucket}", 1)
    pipeline.expire(counter_key, ttl)
    pipeline.execute()


async def record_request_counter(
    redis_client: Any,
    environment: str,
    *,
    monitor: bool,
    status_code: int,
) -> None:
    if redis_client is None:
        return
    try:
        await run_in_threadpool(
            _write_request_counter_sync,
            redis_client,
            environment,
            monitor=monitor,
            status_code=status_code,
        )
    except Exception as exc:  # pragma: no cover - external Redis failure path
        print(f"[Analytics] request counter skipped: {exc}")


def schedule_request_counter(
    redis_client: Any,
    environment: str,
    *,
    monitor: bool,
    status_code: int,
) -> None:
    if redis_client is None:
        return
    try:
        asyncio.create_task(
            record_request_counter(
                redis_client,
                environment,
                monitor=monitor,
                status_code=status_code,
            )
        )
    except RuntimeError:
        return


def _read_summary_sync(redis_client: Any, environment: str, date: str) -> dict[str, Any]:
    counter_key = f"analytics:{environment}:daily:{date}"
    visitors_key = f"analytics:{environment}:unique:visitors:{date}"
    sessions_key = f"analytics:{environment}:unique:sessions:{date}"
    trials_key = f"analytics:{environment}:unique:nctids:{date}"
    counters = redis_client.hgetall(counter_key)
    return {
        "date": date,
        "counters": {key: int(value) for key, value in counters.items()},
        "unique_visitors": int(redis_client.pfcount(visitors_key) or 0),
        "unique_sessions": int(redis_client.pfcount(sessions_key) or 0),
        "unique_nctids": int(redis_client.pfcount(trials_key) or 0),
    }


async def read_usage_summary(redis_client: Any, environment: str, date: str) -> dict[str, Any]:
    if redis_client is None:
        return {
            "date": date,
            "counters": {},
            "unique_visitors": 0,
            "unique_sessions": 0,
            "unique_nctids": 0,
        }
    return await run_in_threadpool(_read_summary_sync, redis_client, environment, date)


def request_nctid(request: Request) -> str | None:
    """Expose the path parser for request middleware and tests."""

    return _request_nctid(request)
