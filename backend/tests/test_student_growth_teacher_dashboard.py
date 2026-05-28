"""Tests for teacher dashboard classroom summaries."""

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


def get_summary(client, classroom_id=1):
    response = client.get(f"/api/v1/teacher-dashboard/classroom/{classroom_id}/summary")
    assert response.status_code == 200
    return response.json()


def seed_demo(client):
    response = client.post("/api/v1/dev/seed-demo-data")
    assert response.status_code == 200
    return response.json()


def create_peer_request(client, seed):
    response = client.post(
        "/api/v1/peer-learning/requests",
        json={
            "requester_student_id": 1,
            "school_id": seed["school_id"],
            "classroom_id": seed["classroom_id"],
            "subject_id": seed["subject_id"],
            "topic_id": seed["topic_id"],
            "learning_log_id": seed["learning_log_id"],
            "message": "I need support with inertia and practical examples.",
        },
    )
    assert response.status_code == 200
    return response.json()


def create_peer_offer(client, seed):
    response = client.post(
        "/api/v1/peer-learning/offers",
        json={
            "helper_student_id": 2,
            "school_id": seed["school_id"],
            "classroom_id": seed["classroom_id"],
            "subject_id": seed["subject_id"],
            "topic_id": seed["topic_id"],
            "message": "I am ready to explain inertia with examples.",
        },
    )
    assert response.status_code == 200
    return response.json()


def test_empty_classroom_summary_returns_zeros_and_arrays(client):
    summary = get_summary(client, classroom_id=1)

    assert summary["classroom_id"] == 1
    assert summary["message"] == "Teacher support summary for student growth."
    assert summary["learning_logs_count"] == 0
    assert summary["students_with_learning_logs_count"] == 0
    assert summary["honest_confusion_count"] == 0
    assert summary["pending_revisions_count"] == 0
    assert summary["overdue_revisions_count"] == 0
    assert summary["completed_revisions_count"] == 0
    assert summary["peer_help_open_requests_count"] == 0
    assert summary["peer_help_completed_sessions_count"] == 0
    assert summary["topics_needing_support"] == []
    assert summary["students_needing_support"] == []
    assert len(summary["supportive_teacher_actions"]) == 3


def test_demo_seed_data_appears_in_teacher_dashboard_summary(client):
    seed = seed_demo(client)

    summary = get_summary(client, classroom_id=seed["classroom_id"])

    assert summary["learning_logs_count"] == 1
    assert summary["students_with_learning_logs_count"] == 1
    assert summary["honest_confusion_count"] == 1
    assert summary["pending_revisions_count"] == 5
    assert summary["overdue_revisions_count"] == 1


def test_honest_confusion_count_increases_when_learning_log_has_not_understood(
    client,
):
    seed = seed_demo(client)

    response = client.post(
        "/api/v1/learning-logs",
        json={
            "student_id": 2,
            "school_id": seed["school_id"],
            "classroom_id": seed["classroom_id"],
            "subject_id": seed["subject_id"],
            "topic_id": seed["topic_id"],
            "taught_today": "Teacher explained Newton's first law again.",
            "understood": "Objects continue rest or motion unless force acts.",
            "not_understood": "I need support connecting this to daily examples.",
            "confidence_level": "MEDIUM",
        },
    )
    assert response.status_code == 200

    summary = get_summary(client, classroom_id=seed["classroom_id"])

    assert summary["learning_logs_count"] == 2
    assert summary["honest_confusion_count"] == 2
    assert summary["students_with_learning_logs_count"] == 2


def test_topics_needing_support_includes_topic_id_1(client):
    seed = seed_demo(client)

    summary = get_summary(client, classroom_id=seed["classroom_id"])
    topic_ids = {topic["topic_id"] for topic in summary["topics_needing_support"]}

    assert seed["topic_id"] in topic_ids
    assert summary["topics_needing_support"][0]["not_understood_count"] == 1
    assert len(summary["topics_needing_support"][0]["latest_confusion_examples"]) == 1


def test_pending_overdue_and_completed_revision_counts_are_calculated(
    client,
    db_session,
):
    seed = seed_demo(client)
    due_today_task = (
        db_session.query(RevisionTask)
        .filter(
            RevisionTask.learning_log_id == seed["learning_log_id"],
            RevisionTask.revision_stage == "7D",
        )
        .first()
    )

    response = client.patch(
        f"/api/v1/revisions/{due_today_task.id}/complete",
        json={
            "difficulty_after_revision": "EASY",
            "revision_text_summary": "I revised the topic and can explain more.",
            "revision_video_url": None,
        },
    )
    assert response.status_code == 200

    summary = get_summary(client, classroom_id=seed["classroom_id"])

    assert summary["pending_revisions_count"] == 4
    assert summary["overdue_revisions_count"] == 1
    assert summary["completed_revisions_count"] == 1


def test_peer_help_open_request_count_appears_after_creating_request(client):
    seed = seed_demo(client)
    create_peer_request(client, seed)

    summary = get_summary(client, classroom_id=seed["classroom_id"])

    assert summary["peer_help_open_requests_count"] == 1


def test_peer_help_completed_session_count_appears_after_completion(client):
    seed = seed_demo(client)
    help_request = create_peer_request(client, seed)
    help_offer = create_peer_offer(client, seed)

    session_response = client.post(
        f"/api/v1/peer-learning/requests/{help_request['id']}/accept",
        json={"helper_student_id": 2, "help_offer_id": help_offer["id"]},
    )
    assert session_response.status_code == 200
    session = session_response.json()

    complete_response = client.patch(
        f"/api/v1/peer-learning/sessions/{session['id']}/complete",
        json={
            "requester_feedback": "I understood better after peer support.",
            "helper_reflection": "Explaining helped me revise again.",
        },
    )
    assert complete_response.status_code == 200

    summary = get_summary(client, classroom_id=seed["classroom_id"])

    assert summary["peer_help_open_requests_count"] == 0
    assert summary["peer_help_completed_sessions_count"] == 1


def test_students_needing_support_includes_student_with_confusion_and_revisions(
    client,
):
    seed = seed_demo(client)

    summary = get_summary(client, classroom_id=seed["classroom_id"])
    student_ids = {
        student["student_id"] for student in summary["students_needing_support"]
    }
    student_one = next(
        student
        for student in summary["students_needing_support"]
        if student["student_id"] == 1
    )

    assert 1 in student_ids
    assert student_one["open_confusions_count"] == 1
    assert student_one["pending_revisions_count"] == 5
    assert student_one["overdue_revisions_count"] == 1
