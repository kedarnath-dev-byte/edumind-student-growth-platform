"""UTC JSON serialization + IST helpers for Learning Log timestamps."""

from datetime import datetime, timezone

from modules.student_growth.ist_time import (
    format_due_at_ist,
    utc_isoformat,
)
from modules.student_growth.schemas import LearningLogResponse, RevisionTaskResponse


def test_utc_isoformat_appends_z_for_naive_utc():
    assert utc_isoformat(datetime(2026, 9, 28, 12, 0, 0)) == "2026-09-28T12:00:00Z"


def test_utc_isoformat_normalizes_aware_to_z():
    aware = datetime(2026, 9, 28, 17, 30, tzinfo=timezone.utc)
    assert utc_isoformat(aware) == "2026-09-28T17:30:00Z"


def test_learning_log_response_json_uses_z_suffix():
    payload = LearningLogResponse(
        id=1,
        student_id=1,
        taught_today="Fractions",
        understood="Half",
        confidence_level="MEDIUM",
        created_at=datetime(2026, 9, 28, 12, 0, 0),
    )
    data = payload.model_dump(mode="json")
    assert data["created_at"] == "2026-09-28T12:00:00Z"


def test_revision_task_due_at_json_uses_z_suffix():
    payload = RevisionTaskResponse(
        id=1,
        learning_log_id=1,
        student_id=1,
        revision_stage="24H",
        due_at=datetime(2026, 9, 29, 12, 0, 0),
        status="PENDING",
        created_at=datetime(2026, 9, 28, 12, 0, 0),
    )
    data = payload.model_dump(mode="json")
    assert data["due_at"].endswith("Z")
    assert data["created_at"].endswith("Z")


def test_format_due_at_ist_matches_whatsapp_style():
    # 12:00 UTC → 17:30 IST
    text = format_due_at_ist(datetime(2026, 9, 28, 12, 0, 0), with_time=True)
    assert "28 Sep 2026" in text
    assert "05:30 PM IST" in text or "5:30 PM IST" in text
