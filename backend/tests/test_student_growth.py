"""
Tests for the EduMind Student Growth Platform MVP core loop.
"""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from core.database import Base
from modules.student_growth.learning_log_service import LearningLogService
from modules.student_growth.models import RewardEvent, RevisionTask
from modules.student_growth.revision_service import RevisionService
from modules.student_growth.schemas import LearningLogCreate


@pytest.fixture(scope="function")
def db_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=engine)
    TestSession = sessionmaker(bind=engine)
    session = TestSession()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)


def make_learning_log_payload(not_understood="Need help with examples."):
    return LearningLogCreate(
        student_id=1,
        school_id=1,
        classroom_id=1,
        subject_id=1,
        topic_id=1,
        taught_today="Teacher explained photosynthesis and chlorophyll.",
        understood="Plants use sunlight to make food.",
        not_understood=not_understood,
        confidence_level="MEDIUM",
    )


def test_creating_learning_log_creates_exactly_five_revision_tasks(db_session):
    result = LearningLogService(db_session).create_learning_log(
        make_learning_log_payload()
    )

    tasks = (
        db_session.query(RevisionTask)
        .filter(RevisionTask.learning_log_id == result["learning_log"].id)
        .all()
    )

    assert len(tasks) == 5


def test_revision_stages_are_fixed_spaced_repetition_stages(db_session):
    result = LearningLogService(db_session).create_learning_log(
        make_learning_log_payload()
    )

    stages = [
        task.revision_stage
        for task in (
            db_session.query(RevisionTask)
            .filter(RevisionTask.learning_log_id == result["learning_log"].id)
            .order_by(RevisionTask.due_at.asc())
            .all()
        )
    ]

    assert stages == ["24H", "7D", "1M", "3M", "6M"]


def test_honest_confusion_reward_created_when_not_understood_is_not_empty(db_session):
    result = LearningLogService(db_session).create_learning_log(
        make_learning_log_payload(not_understood="I need support with the equation.")
    )

    rewards = (
        db_session.query(RewardEvent)
        .filter(RewardEvent.learning_log_id == result["learning_log"].id)
        .all()
    )
    reward_types = {reward.event_type for reward in rewards}
    messages = {reward.message for reward in rewards}

    assert "HONEST_CONFUSION_SHARED" in reward_types
    assert "Great honesty. Now we know what to improve." in messages


def test_completing_revision_changes_status_and_creates_reward(db_session):
    result = LearningLogService(db_session).create_learning_log(
        make_learning_log_payload()
    )
    revision_task = result["revision_tasks"][0]

    completed = RevisionService(db_session).complete_revision(
        revision_task_id=revision_task.id,
        difficulty_after_revision="EASY",
    )

    rewards = (
        db_session.query(RewardEvent)
        .filter(RewardEvent.revision_task_id == revision_task.id)
        .all()
    )

    assert completed["revision_task"].status == "COMPLETED"
    assert completed["revision_task"].difficulty_after_revision == "EASY"
    assert completed["revision_task"].completed_at is not None
    assert len(rewards) == 1
    assert rewards[0].event_type == "REVISION_COMPLETED"
