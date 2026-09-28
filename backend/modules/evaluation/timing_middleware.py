"""
@module    evaluation.timing_middleware
@description FastAPI middleware that intercepts every HTTP request,
             measures response time in milliseconds, and logs it to
             the api_metrics table via EvaluationRepository.
             Attached once in main.py — zero changes needed in controllers.

             IMPORTANT: metric writes must NOT block the response. A sync
             SessionLocal()+commit against remote Postgres (Supabase) was
             adding ~2s to every /api/v1/* call and serializing concurrent
             boot fetches. Logging runs in a background thread pool.
@author    EduMind AI Engineering
"""

from __future__ import annotations

import asyncio
import logging
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from core.database import SessionLocal

_logger = logging.getLogger(__name__)

# Bounded pool so metric logging cannot starve the API process.
_metric_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="api-metrics")

# Exact paths that must stay cheap (health / docs / keep-warm).
_SKIP_EXACT = {
    "/",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/favicon.ico",
    "/api/v1/health",
}


def should_skip_metric_log(path: str, method: str) -> bool:
    """Return True when this request should not write an api_metrics row."""
    method_upper = (method or "GET").upper()
    if method_upper == "OPTIONS":
        return True
    if path in _SKIP_EXACT:
        return True
    # Any dedicated health probe (Render healthCheckPath, keep-warm, etc.)
    if path.endswith("/health") or path.endswith("/healthz"):
        return True
    if path.startswith("/docs") or path.startswith("/redoc"):
        return True
    return False


def _write_metric(
    endpoint: str,
    method: str,
    status_code: int,
    response_time_ms: float,
    error_message: Optional[str],
) -> None:
    """Best-effort sync write; never raises to the request path."""
    db = None
    try:
        db = SessionLocal()
        from modules.evaluation.evaluation_repository import EvaluationRepository

        repo = EvaluationRepository(db)
        repo.log_api_call(
            endpoint=endpoint,
            method=method,
            status_code=status_code,
            response_time_ms=response_time_ms,
            error_message=error_message,
        )
    except Exception:
        _logger.debug("api metric log failed", exc_info=True)
    finally:
        if db is not None:
            try:
                db.close()
            except Exception:
                pass


class TimingMiddleware(BaseHTTPMiddleware):
    """
    Intercepts every request, measures elapsed time,
    and schedules one APIMetric row per call without blocking TTFB.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        """Time the request; schedule metric write without blocking the client."""
        start_time = time.perf_counter()
        response: Optional[Response] = None
        error_msg: Optional[str] = None
        status_code = 500

        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception as e:
            error_msg = str(e)
            status_code = 500
            raise
        finally:
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            endpoint = request.url.path
            method = request.method

            if not should_skip_metric_log(endpoint, method):
                try:
                    loop = asyncio.get_running_loop()
                    loop.run_in_executor(
                        _metric_executor,
                        _write_metric,
                        endpoint,
                        method,
                        status_code,
                        elapsed_ms,
                        error_msg,
                    )
                except Exception:
                    # Never crash or delay the client for metrics.
                    _logger.debug("failed to schedule api metric log", exc_info=True)

        return response
