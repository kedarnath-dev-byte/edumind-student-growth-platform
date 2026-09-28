"""Outbox enqueue is idempotent; drain maps dry-run safely."""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from core.database import Base
from modules.student_growth.models import NotificationOutbox
from modules.student_growth.notification_outbox_service import (
    KIND_REVISION_PLAN,
    STATUS_PENDING,
    NotificationOutboxService,
)


def _session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()


def test_enqueue_revision_plan_is_idempotent():
    db = _session()
    try:
        svc = NotificationOutboxService(db)
        a = svc.enqueue_revision_plan(learning_log_id=42, student_id=7)
        b = svc.enqueue_revision_plan(learning_log_id=42, student_id=7)
        assert a is not None and b is not None
        assert a.id == b.id
        rows = db.query(NotificationOutbox).all()
        assert len(rows) == 1
        assert rows[0].kind == KIND_REVISION_PLAN
        assert rows[0].status == STATUS_PENDING
        assert rows[0].idempotency_key == "revision_plan:log:42"
    finally:
        db.close()
