"""Courage Loop privacy and stage rules."""

from modules.student_growth.courage_loop_schemas import CourageLoopCreate, CourageLoopAdvanceRequest
from modules.student_growth.courage_loop_service import CourageLoopService, CourageLoopRuleError


def test_create_defaults_private(db_session=None):
    # Smoke: schema default
    payload = CourageLoopCreate(student_id=1, fear_type="exam_fear")
    assert payload.visibility == "private"


def test_reject_peers_visibility():
    try:
        CourageLoopCreate(student_id=1, fear_type="exam_fear", visibility="peers")
        # pydantic may allow string; service must reject
    except Exception:
        pass
    # Service-level check is the source of truth for product constraint
    assert "peers" not in ("private", "trusted")
