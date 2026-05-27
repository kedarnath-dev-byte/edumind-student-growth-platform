"""Tests for student habit summary metrics."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from core.database import Base, get_db
from main import app
from modules.student_growth.models import RevisionTask


@pytest.fixture(scope="function")
def db_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestSession = sessionmaker(bind=engine)
    session = TestSession()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def get_seed_task(db_session, learning_log_id, revision_stage):
    return (
        db_session.query(RevisionTask)
        .filter(
            RevisionTask.learning_log_id == learning_log_id,
            RevisionTask.revision_stage == revision_stage,
        )
        .first()
    )


def get_habit_summary(client):
    response = client.get("/api/v1/habits/student/1/summary")
    assert response.status_code == 200
    return response.json()


def complete_revision(client, revision_task_id, difficulty="MEDIUM"):
    return client.patch(
        f"/api/v1/revisions/{revision_task_id}/complete",
        json={
            "difficulty_after_revision": difficulty,
            "revision_text_summary": "I revised and wrote my learning proof.",
            "revision_video_url": None,
        },
    )


def test_empty_student_habit_summary_returns_zeros_and_no_revision_due(client):
    summary = get_habit_summary(client)

    assert summary["student_id"] == 1
    assert summary["message"] == "Success is built through daily habits."
    assert summary["daily_learning_logs_count"] == 0
    assert summary["honest_confusion_count"] == 0
    assert summary["revision_completed_count"] == 0
    assert summary["on_time_revision_completed_count"] == 0
    assert summary["memory_rescue_completed_count"] == 0
    assert summary["total_reward_points"] == 0
    assert summary["today_due_revisions_count"] == 0
    assert summary["today_completed_revisions_count"] == 0
    assert summary["today_pending_revisions_count"] == 0
    assert summary["today_habit_status"] == "NO_REVISION_DUE"
    assert len(summary["habit_cards"]) == 4


def test_seed_demo_data_creates_learning_and_honest_reflection_habits(client):
    client.post("/api/v1/dev/seed-demo-data")

    summary = get_habit_summary(client)

    assert summary["daily_learning_logs_count"] == 1
    assert summary["honest_confusion_count"] == 1
    assert summary["habit_cards"][0]["name"] == "Daily Learning Habit"
    assert summary["habit_cards"][1]["name"] == "Honest Reflection Habit"


def test_completing_due_today_revision_updates_completed_count(
    client,
    db_session,
):
    seed = client.post("/api/v1/dev/seed-demo-data").json()
    due_today_task = get_seed_task(db_session, seed["learning_log_id"], "7D")

    response = complete_revision(client, due_today_task.id, difficulty="EASY")
    summary = get_habit_summary(client)

    assert response.status_code == 200
    assert summary["revision_completed_count"] == 1
    assert summary["on_time_revision_completed_count"] == 1


def test_completing_overdue_revision_updates_memory_rescue_count(
    client,
    db_session,
):
    seed = client.post("/api/v1/dev/seed-demo-data").json()
    overdue_task = get_seed_task(db_session, seed["learning_log_id"], "24H")

    response = complete_revision(client, overdue_task.id, difficulty="HARD")
    summary = get_habit_summary(client)

    assert response.status_code == 200
    assert summary["revision_completed_count"] == 1
    assert summary["memory_rescue_completed_count"] == 1


def test_reward_points_are_summed_correctly(client, db_session):
    seed = client.post("/api/v1/dev/seed-demo-data").json()
    due_today_task = get_seed_task(db_session, seed["learning_log_id"], "7D")

    complete_revision(client, due_today_task.id, difficulty="MEDIUM")
    summary = get_habit_summary(client)

    assert summary["total_reward_points"] == 25


def test_today_habit_status_changes_for_due_today_pending_and_completed(
    client,
    db_session,
):
    seed = client.post("/api/v1/dev/seed-demo-data").json()
    due_today_task = get_seed_task(db_session, seed["learning_log_id"], "7D")

    pending_summary = get_habit_summary(client)
    complete_revision(client, due_today_task.id, difficulty="EASY")
    completed_summary = get_habit_summary(client)

    assert pending_summary["today_due_revisions_count"] == 1
    assert pending_summary["today_pending_revisions_count"] == 1
    assert pending_summary["today_habit_status"] == "NOT_STARTED"
    assert completed_summary["today_completed_revisions_count"] == 1
    assert completed_summary["today_pending_revisions_count"] == 0
    assert completed_summary["today_habit_status"] == "DONE"


def test_today_habit_status_in_progress_when_some_due_today_done(
    client,
    db_session,
):
    first_seed = client.post("/api/v1/dev/seed-demo-data").json()
    second_seed = client.post("/api/v1/dev/seed-demo-data").json()
    first_due_today_task = get_seed_task(db_session, first_seed["learning_log_id"], "7D")

    complete_revision(client, first_due_today_task.id, difficulty="MEDIUM")
    summary = get_habit_summary(client)

    assert second_seed["learning_log_id"] != first_seed["learning_log_id"]
    assert summary["today_due_revisions_count"] == 2
    assert summary["today_completed_revisions_count"] == 1
    assert summary["today_pending_revisions_count"] == 1
    assert summary["today_habit_status"] == "IN_PROGRESS"
