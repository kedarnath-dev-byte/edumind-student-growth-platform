"""Light tests for P0 product_events helper."""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from core.database import Base
from modules.student_growth.models import ProductEvent
from modules.student_growth.product_events import LOG_CREATED, record_product_event


def test_record_product_event_inserts_row():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        record_product_event(
            LOG_CREATED,
            student_id=7,
            school_id=1,
            entity_type="learning_log",
            entity_id=42,
            payload={"ok": True},
            db=db,
        )
        rows = db.query(ProductEvent).all()
        assert len(rows) == 1
        assert rows[0].event_name == LOG_CREATED
        assert rows[0].student_id == 7
        assert rows[0].entity_id == "42"
        assert rows[0].payload_json.get("ok") is True
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


def test_record_product_event_swallows_errors():
    # Invalid session-less call should not raise
    record_product_event("log_created", student_id=1)  # uses SessionLocal; may fail quietly
