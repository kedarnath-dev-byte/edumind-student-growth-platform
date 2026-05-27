"""Tests for development demo seed data endpoint."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from core.database import Base, get_db
from main import app
from modules.student_growth.models import (
    Classroom,
    LearningLog,
    RevisionTask,
    School,
    Subject,
    Topic,
)


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


def test_seed_demo_data_returns_success(client):
    response = client.post("/api/v1/dev/seed-demo-data")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["message"] == "Demo seed data ready"
    assert data["school_id"]
    assert data["classroom_id"]
    assert data["subject_id"]
    assert data["topic_id"]
    assert data["learning_log_id"]
    assert len(data["revision_task_ids"]) == 5
    assert len(data["reward_ids"]) == 2


def test_seed_demo_data_creates_setup_learning_log_and_revisions(client, db_session):
    response = client.post("/api/v1/dev/seed-demo-data")
    data = response.json()

    assert db_session.query(School).count() == 1
    assert db_session.query(Classroom).count() == 1
    assert db_session.query(Subject).count() == 1
    assert db_session.query(Topic).count() == 1
    assert db_session.query(LearningLog).filter(
        LearningLog.id == data["learning_log_id"]
    ).count() == 1
    assert db_session.query(RevisionTask).filter(
        RevisionTask.learning_log_id == data["learning_log_id"]
    ).count() == 5


def test_seed_demo_revisions_include_overdue_today_and_future(client, db_session):
    response = client.post("/api/v1/dev/seed-demo-data")
    data = response.json()
    tasks = (
        db_session.query(RevisionTask)
        .filter(RevisionTask.learning_log_id == data["learning_log_id"])
        .all()
    )

    stage_to_task = {task.revision_stage: task for task in tasks}
    today = stage_to_task["7D"].due_at.date()

    assert stage_to_task["24H"].due_at.date() < today
    assert stage_to_task["24H"].status == "PENDING"
    assert stage_to_task["7D"].due_at.date() == today
    assert stage_to_task["7D"].status == "PENDING"
    assert stage_to_task["1M"].due_at.date() > today
    assert stage_to_task["3M"].due_at.date() > today
    assert stage_to_task["6M"].due_at.date() > today


def test_seed_demo_twice_reuses_setup_data(client, db_session):
    first = client.post("/api/v1/dev/seed-demo-data").json()
    second = client.post("/api/v1/dev/seed-demo-data").json()

    assert first["school_id"] == second["school_id"]
    assert first["classroom_id"] == second["classroom_id"]
    assert first["subject_id"] == second["subject_id"]
    assert first["topic_id"] == second["topic_id"]
    assert first["learning_log_id"] != second["learning_log_id"]
    assert db_session.query(School).filter(
        School.name == "EduMind Public School"
    ).count() == 1
    assert db_session.query(Classroom).filter(
        Classroom.name == "Class 8 A"
    ).count() == 1
    assert db_session.query(Subject).filter(
        Subject.name == "Physics"
    ).count() == 1
    assert db_session.query(Topic).filter(
        Topic.name == "Newton's First Law"
    ).count() == 1
