"""Tests for parent dashboard student summaries."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from core.database import Base, get_db
from main import app


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


def get_summary(client, student_id=1):
    response = client.get(f"/api/v1/parent-dashboard/student/{student_id}/summary")
    assert response.status_code == 200
    return response.json()


def seed_demo(client):
    response = client.post("/api/v1/dev/seed-demo-data")
    assert response.status_code == 200
    return response.json()


def test_empty_student_parent_dashboard_returns_zeros_and_safe_arrays(client):
    summary = get_summary(client)

    assert summary["student_id"] == 1
    assert summary["message"] == "Parent growth summary for your child."
    assert summary["learning_logs_count"] == 0
    assert summary["latest_learning_logs"] == []
    assert summary["honest_confusion_count"] == 0
    assert summary["revision_summary"]["pending_revisions_count"] == 0
    assert summary["habit_summary"]["total_reward_points"] == 0
    assert summary["peer_learning_summary"]["help_requests_created_count"] == 0
    assert summary["topics_needing_support"] == []
    assert len(summary["parent_support_suggestions"]) >= 3


def test_demo_seed_data_appears_in_parent_dashboard_summary(client):
    seed_demo(client)

    summary = get_summary(client)

    assert summary["learning_logs_count"] == 1
    assert summary["honest_confusion_count"] == 1
    assert len(summary["latest_learning_logs"]) == 1
    assert summary["habit_summary"]["daily_learning_logs_count"] == 1


def test_latest_learning_logs_include_learning_reflection_fields(client):
    seed_demo(client)

    summary = get_summary(client)
    latest_log = summary["latest_learning_logs"][0]

    assert latest_log["taught_today"]
    assert latest_log["understood"]
    assert latest_log["not_understood"]
    assert latest_log["confidence_level"] == "MEDIUM"
    assert latest_log["topic_id"] == 1
    assert latest_log["created_at"]


def test_revision_summary_shows_pending_and_overdue_counts(client):
    seed_demo(client)

    summary = get_summary(client)
    revision_summary = summary["revision_summary"]

    assert revision_summary["pending_revisions_count"] == 5
    assert revision_summary["overdue_revisions_count"] == 1
    assert revision_summary["completed_revisions_count"] == 0
    assert revision_summary["on_time_revision_completed_count"] == 0
    assert revision_summary["memory_rescue_completed_count"] == 0


def test_parent_dashboard_habit_summary_includes_points_and_status(client):
    seed_demo(client)

    summary = get_summary(client)
    habit_summary = summary["habit_summary"]

    assert habit_summary["daily_learning_logs_count"] == 1
    assert habit_summary["honest_confusion_count"] == 1
    assert habit_summary["total_reward_points"] == 15
    assert habit_summary["today_habit_status"] == "NOT_STARTED"


def test_peer_learning_summary_counts_requests_offers_and_sessions(client):
    seed = seed_demo(client)
    request_response = client.post(
        "/api/v1/peer-learning/requests",
        json={
            "requester_student_id": 1,
            "school_id": seed["school_id"],
            "classroom_id": seed["classroom_id"],
            "subject_id": seed["subject_id"],
            "topic_id": seed["topic_id"],
            "learning_log_id": seed["learning_log_id"],
            "message": "I need support with the bus sudden-stop example.",
        },
    )
    assert request_response.status_code == 200
    help_request = request_response.json()

    offer_by_student = client.post(
        "/api/v1/peer-learning/offers",
        json={
            "helper_student_id": 1,
            "school_id": seed["school_id"],
            "classroom_id": seed["classroom_id"],
            "subject_id": seed["subject_id"],
            "topic_id": seed["topic_id"],
            "message": "I can help explain another example.",
        },
    )
    assert offer_by_student.status_code == 200

    offer_by_helper = client.post(
        "/api/v1/peer-learning/offers",
        json={
            "helper_student_id": 2,
            "school_id": seed["school_id"],
            "classroom_id": seed["classroom_id"],
            "subject_id": seed["subject_id"],
            "topic_id": seed["topic_id"],
            "message": "I can explain inertia with practical examples.",
        },
    )
    assert offer_by_helper.status_code == 200

    accept_response = client.post(
        f"/api/v1/peer-learning/requests/{help_request['id']}/accept",
        json={
            "helper_student_id": 2,
            "help_offer_id": offer_by_helper.json()["id"],
        },
    )
    assert accept_response.status_code == 200
    session = accept_response.json()

    complete_response = client.patch(
        f"/api/v1/peer-learning/sessions/{session['id']}/complete",
        json={
            "requester_feedback": "I understood better after peer support.",
            "helper_reflection": "Explaining helped me revise.",
        },
    )
    assert complete_response.status_code == 200

    summary = get_summary(client)
    peer_summary = summary["peer_learning_summary"]

    assert peer_summary["help_requests_created_count"] == 1
    assert peer_summary["help_offers_created_count"] == 1
    assert peer_summary["peer_sessions_as_requester_count"] == 1
    assert peer_summary["peer_sessions_as_helper_count"] == 0
    assert peer_summary["peer_sessions_completed_count"] == 1


def test_topics_needing_support_includes_topic_id_when_confusion_exists(client):
    seed = seed_demo(client)

    summary = get_summary(client)
    topic_ids = {topic["topic_id"] for topic in summary["topics_needing_support"]}

    assert seed["topic_id"] in topic_ids
    assert summary["topics_needing_support"][0]["not_understood_count"] == 1
    assert len(summary["topics_needing_support"][0]["latest_confusion_examples"]) == 1


def test_parent_support_suggestions_are_returned(client):
    summary = get_summary(client)

    assert len(summary["parent_support_suggestions"]) >= 3
    assert "homework" in summary["parent_support_suggestions"][0]
    assert all("weak" not in suggestion.lower() for suggestion in summary["parent_support_suggestions"])
