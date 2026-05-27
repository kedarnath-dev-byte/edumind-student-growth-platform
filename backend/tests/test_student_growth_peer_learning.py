"""Tests for Peer Learning Circle backend APIs."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from core.database import Base, get_db
from main import app
from modules.student_growth.models import (
    PeerHelpOffer,
    PeerHelpRequest,
    PeerHelpSession,
    RewardEvent,
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


def help_request_payload(student_id=1, topic_id=1):
    return {
        "requester_student_id": student_id,
        "school_id": 1,
        "classroom_id": 1,
        "subject_id": 1,
        "topic_id": topic_id,
        "learning_log_id": 1,
        "message": "I need support with inertia and bus sudden-stop example.",
    }


def help_offer_payload(student_id=2, topic_id=1):
    return {
        "helper_student_id": student_id,
        "school_id": 1,
        "classroom_id": 1,
        "subject_id": 1,
        "topic_id": topic_id,
        "message": "I can explain Newton's first law with practical examples.",
    }


def create_request(client, student_id=1, topic_id=1):
    return client.post(
        "/api/v1/peer-learning/requests",
        json=help_request_payload(student_id=student_id, topic_id=topic_id),
    )


def create_offer(client, student_id=2, topic_id=1):
    return client.post(
        "/api/v1/peer-learning/offers",
        json=help_offer_payload(student_id=student_id, topic_id=topic_id),
    )


def accept_request(client, request_id, helper_id=2, offer_id=None):
    return client.post(
        f"/api/v1/peer-learning/requests/{request_id}/accept",
        json={"helper_student_id": helper_id, "help_offer_id": offer_id},
    )


def test_student_can_create_help_request(client, db_session):
    response = create_request(client)
    data = response.json()

    assert response.status_code == 200
    assert data["requester_student_id"] == 1
    assert data["status"] == "OPEN"
    assert "need support" in data["message"]
    assert db_session.query(PeerHelpRequest).count() == 1


def test_student_can_create_help_offer(client, db_session):
    response = create_offer(client)
    data = response.json()

    assert response.status_code == 200
    assert data["helper_student_id"] == 2
    assert data["status"] == "AVAILABLE"
    assert "explain" in data["message"]
    assert db_session.query(PeerHelpOffer).count() == 1


def test_open_requests_endpoint_returns_request(client):
    created = create_request(client).json()

    response = client.get("/api/v1/peer-learning/requests/open")
    data = response.json()

    assert response.status_code == 200
    assert len(data) == 1
    assert data[0]["id"] == created["id"]


def test_available_offers_endpoint_returns_offer(client):
    created = create_offer(client).json()

    response = client.get("/api/v1/peer-learning/offers/available")
    data = response.json()

    assert response.status_code == 200
    assert len(data) == 1
    assert data[0]["id"] == created["id"]


def test_helper_can_accept_request_and_create_session(client, db_session):
    help_request = create_request(client).json()
    help_offer = create_offer(client).json()

    response = accept_request(
        client,
        help_request["id"],
        helper_id=2,
        offer_id=help_offer["id"],
    )
    data = response.json()
    request_row = db_session.get(PeerHelpRequest, help_request["id"])
    offer_row = db_session.get(PeerHelpOffer, help_offer["id"])

    assert response.status_code == 200
    assert data["status"] == "ACTIVE"
    assert data["requester_student_id"] == 1
    assert data["helper_student_id"] == 2
    assert request_row.status == "ACCEPTED"
    assert offer_row.status == "MATCHED"
    assert db_session.query(PeerHelpSession).count() == 1


def test_same_student_cannot_accept_own_request(client):
    help_request = create_request(client, student_id=1).json()

    response = accept_request(client, help_request["id"], helper_id=1)

    assert response.status_code == 400
    assert response.json()["detail"] == (
        "A requester and helper must be different students."
    )


def test_completing_session_updates_session_request_offer_and_rewards(
    client,
    db_session,
):
    help_request = create_request(client).json()
    help_offer = create_offer(client).json()
    session = accept_request(
        client,
        help_request["id"],
        helper_id=2,
        offer_id=help_offer["id"],
    ).json()

    response = client.patch(
        f"/api/v1/peer-learning/sessions/{session['id']}/complete",
        json={
            "requester_feedback": "I understood better after my friend explained.",
            "helper_reflection": "Explaining helped me revise the concept again.",
        },
    )
    data = response.json()
    request_row = db_session.get(PeerHelpRequest, help_request["id"])
    offer_row = db_session.get(PeerHelpOffer, help_offer["id"])
    rewards = db_session.query(RewardEvent).order_by(RewardEvent.points.asc()).all()

    assert response.status_code == 200
    assert data["status"] == "COMPLETED"
    assert data["completed_at"] is not None
    assert request_row.status == "COMPLETED"
    assert offer_row.status == "COMPLETED"
    assert [reward.event_type for reward in rewards] == [
        "PEER_HELP_RECEIVED",
        "PEER_HELP_GIVEN",
    ]
    assert [reward.points for reward in rewards] == [5, 15]


def test_topic_circle_returns_open_request_and_available_helper_counts(client):
    create_request(client, topic_id=1)
    create_request(client, topic_id=2)
    create_offer(client, topic_id=1)
    create_offer(client, topic_id=2)

    response = client.get("/api/v1/peer-learning/topic/1/circle")
    data = response.json()

    assert response.status_code == 200
    assert data["topic_id"] == 1
    assert data["open_requests_count"] == 1
    assert data["available_helpers_count"] == 1
    assert data["open_requests"][0]["topic_id"] == 1
    assert data["available_offers"][0]["topic_id"] == 1


def test_student_sessions_endpoint_returns_sessions_for_requester_and_helper(client):
    first_request = create_request(client, student_id=1).json()
    first_session = accept_request(client, first_request["id"], helper_id=2).json()
    second_request = create_request(client, student_id=3).json()
    second_session = accept_request(client, second_request["id"], helper_id=1).json()

    response = client.get("/api/v1/peer-learning/student/1/sessions")
    data = response.json()
    session_ids = {session["id"] for session in data}

    assert response.status_code == 200
    assert session_ids == {first_session["id"], second_session["id"]}
