"""
Tests for the EduMind Student Growth Platform MVP core loop.
"""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from core.database import Base
from modules.student_growth.learning_log_controller import serialize_learning_log
from modules.student_growth.learning_log_service import LearningLogService
from modules.student_growth.models import RewardEvent, RevisionAttempt, RevisionTask
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


def test_completing_revision_creates_revision_attempt(db_session):
    result = LearningLogService(db_session).create_learning_log(
        make_learning_log_payload()
    )
    revision_task = result["revision_tasks"][0]

    completed = RevisionService(db_session).complete_revision(
        revision_task_id=revision_task.id,
        difficulty_after_revision="EASY",
        revision_text_summary="I revised the main idea and can explain it.",
    )

    attempt = (
        db_session.query(RevisionAttempt)
        .filter(RevisionAttempt.revision_task_id == revision_task.id)
        .first()
    )

    assert completed["attempt"].id == attempt.id
    assert attempt.revision_task_id == revision_task.id
    assert attempt.student_id == revision_task.student_id
    assert attempt.learning_log_id == revision_task.learning_log_id
    assert attempt.attempt_number == 1
    assert attempt.difficulty_after_revision == "EASY"
    assert attempt.revision_text_summary == "I revised the main idea and can explain it."
    assert attempt.points_awarded == RevisionService.REVISION_COMPLETION_POINTS


def test_revision_attempt_stores_due_date_status_and_days_late(db_session):
    result = LearningLogService(db_session).create_learning_log(
        make_learning_log_payload()
    )
    revision_task = result["revision_tasks"][0]

    RevisionService(db_session).complete_revision(
        revision_task_id=revision_task.id,
        difficulty_after_revision="MEDIUM",
    )
    attempt = (
        db_session.query(RevisionAttempt)
        .filter(RevisionAttempt.revision_task_id == revision_task.id)
        .first()
    )

    expected_days_late = max(
        (attempt.completed_at.date() - revision_task.due_at.date()).days,
        0,
    )
    assert attempt.completed_on_due_date == (
        attempt.completed_at.date() == revision_task.due_at.date()
    )
    assert attempt.days_late == expected_days_late


def test_completing_already_completed_revision_does_not_duplicate_attempt(db_session):
    result = LearningLogService(db_session).create_learning_log(
        make_learning_log_payload()
    )
    revision_task = result["revision_tasks"][0]
    service = RevisionService(db_session)

    first = service.complete_revision(
        revision_task_id=revision_task.id,
        difficulty_after_revision="MEDIUM",
    )
    second = service.complete_revision(
        revision_task_id=revision_task.id,
        difficulty_after_revision="EASY",
    )

    attempts = (
        db_session.query(RevisionAttempt)
        .filter(RevisionAttempt.revision_task_id == revision_task.id)
        .all()
    )
    rewards = (
        db_session.query(RewardEvent)
        .filter(RewardEvent.revision_task_id == revision_task.id)
        .all()
    )

    assert first["attempt"].id == second["attempt"].id
    assert second["already_completed"] is True
    assert len(attempts) == 1
    assert len(rewards) == 1


def test_list_attempts_for_revision_returns_attempt(db_session):
    result = LearningLogService(db_session).create_learning_log(
        make_learning_log_payload()
    )
    revision_task = result["revision_tasks"][0]
    service = RevisionService(db_session)

    service.complete_revision(
        revision_task_id=revision_task.id,
        difficulty_after_revision="HARD",
    )
    attempts = service.list_attempts_for_revision(revision_task.id)

    assert len(attempts) == 1
    assert attempts[0].revision_task_id == revision_task.id


def test_learning_log_controller_serializes_clean_response(db_session):
    result = LearningLogService(db_session).create_learning_log(
        LearningLogCreate(
            student_id=1,
            school_id=1,
            classroom_id=1,
            subject_id=1,
            topic_id=1,
            taught_today=(
                "Teacher explained Newton's first law of motion with examples "
                "of bus movement and inertia."
            ),
            understood=(
                "I understood that an object continues in rest or motion unless "
                "an external force acts on it."
            ),
            not_understood=(
                "I am still confused about why passengers move forward when a "
                "bus suddenly stops."
            ),
            confidence_level="MEDIUM",
        )
    )

    response = serialize_learning_log(
        result["learning_log"],
        revision_tasks=result["revision_tasks"],
        rewards=result["rewards"],
    )
    data = response.model_dump()

    assert data["student_id"] == 1
    assert data["confidence_level"] == "MEDIUM"
    assert "_sa_instance_state" not in data
    assert len(data["revision_tasks"]) == 5
    assert len(data["rewards"]) == 2
    assert data["rewards"][1]["message"] == (
        "Great honesty. Now we know what to improve."
    )
