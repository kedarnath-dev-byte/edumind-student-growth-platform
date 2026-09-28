"""Fire-and-forget product funnel events. Never break primary flows."""

from __future__ import annotations

import logging
from typing import Any, Optional

from sqlalchemy.orm import Session

from core.database import SessionLocal
from modules.student_growth.models import ProductEvent

logger = logging.getLogger(__name__)

# Canonical P0 event names
LOG_CREATED = "log_created"
REVISION_COMPLETED = "revision_completed"
MUX_ATTACH_OK = "mux_attach_ok"
MUX_ATTACH_FAIL = "mux_attach_fail"
WHATSAPP_SENT = "whatsapp_sent"
WHATSAPP_SKIP = "whatsapp_skip"


def record_product_event(
    event_name: str,
    *,
    student_id: Optional[int] = None,
    school_id: Optional[int] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[Any] = None,
    payload: Optional[dict] = None,
    db: Optional[Session] = None,
) -> None:
    """Insert one product_events row.

    Uses a private SessionLocal when db is omitted so caller transactions
    are never rolled back on analytics failure.
    """
    owns_session = db is None
    session = db if db is not None else SessionLocal()
    try:
        row = ProductEvent(
            event_name=str(event_name),
            student_id=student_id,
            school_id=school_id,
            entity_type=entity_type,
            entity_id=None if entity_id is None else str(entity_id),
            payload_json=payload or {},
        )
        session.add(row)
        session.commit()
    except Exception:
        try:
            session.rollback()
        except Exception:
            pass
        logger.exception(
            "product_event_record_failed event=%s student_id=%s",
            event_name,
            student_id,
        )
    finally:
        if owns_session:
            try:
                session.close()
            except Exception:
                pass
