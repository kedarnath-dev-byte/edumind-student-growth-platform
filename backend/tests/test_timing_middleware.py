"""Unit tests for TimingMiddleware skip rules (no DB required)."""

from modules.evaluation.timing_middleware import should_skip_metric_log


def test_skip_root_and_docs():
    assert should_skip_metric_log("/", "GET") is True
    assert should_skip_metric_log("/docs", "GET") is True
    assert should_skip_metric_log("/openapi.json", "GET") is True
    assert should_skip_metric_log("/favicon.ico", "GET") is True


def test_skip_health_probes():
    assert should_skip_metric_log("/api/v1/health", "GET") is True
    assert should_skip_metric_log("/healthz", "GET") is True
    assert should_skip_metric_log("/ready/health", "GET") is True


def test_skip_cors_preflight():
    assert should_skip_metric_log("/api/v1/learning-logs/student/1", "OPTIONS") is True


def test_log_student_apis():
    assert should_skip_metric_log("/api/v1/learning-logs/student/1", "GET") is False
    assert should_skip_metric_log("/api/v1/revisions/student/1", "GET") is False
    assert should_skip_metric_log("/api/v1/auth/me", "GET") is False
    assert should_skip_metric_log("/api/v1/habits/student/1/summary", "GET") is False
