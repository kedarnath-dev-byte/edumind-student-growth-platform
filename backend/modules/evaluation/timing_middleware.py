"""
@module    evaluation.timing_middleware
@description FastAPI middleware that intercepts every HTTP request,
             measures response time in milliseconds, and logs it to
             the api_metrics table via EvaluationRepository.
             Attached once in main.py — zero changes needed in controllers.
@author    EduMind AI Engineering
"""

import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from backend.core.database import SessionLocal


class TimingMiddleware(BaseHTTPMiddleware):
    """
    Intercepts every request, measures elapsed time,
    and writes one APIMetric row per call.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        """Time the request and log it after the response is sent."""
        start_time = time.perf_counter()
        response = None
        error_msg = None

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

            # Skip logging health-check spam and static assets
            skip_paths = {"/", "/docs", "/openapi.json", "/favicon.ico"}
            if endpoint not in skip_paths:
                try:
                    db = SessionLocal()
                    from backend.modules.evaluation.evaluation_repository import EvaluationRepository
                    repo = EvaluationRepository(db)
                    repo.log_api_call(
                        endpoint=endpoint,
                        method=method,
                        status_code=status_code,
                        response_time_ms=elapsed_ms,
                        error_message=error_msg,
                    )
                    db.close()
                except Exception:
                    pass  # Never crash the app due to logging failure

        return response