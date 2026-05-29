"""Production-readiness safety tests for pilot user onboarding."""

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


def create_user(client, email, phone=None, role="STUDENT"):
    response = client.post(
        "/api/v1/users",
        json={
            "full_name": "Pilot User",
            "email": email,
            "phone": phone,
            "role": role,
        },
    )
    return response


def test_app_user_blank_phone_becomes_none(client):
    response = create_user(client, "student1@edumind.local", phone="   ")
    data = response.json()

    assert response.status_code == 200
    assert data["phone"] is None


def test_multiple_users_with_blank_phone_can_be_created(client):
    first = create_user(client, "student1@edumind.local", phone="")
    second = create_user(client, "student2@edumind.local", phone="")

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["phone"] is None
    assert second.json()["phone"] is None


def test_duplicate_email_returns_clean_error(client):
    first = create_user(client, "student1@edumind.local")
    duplicate = create_user(client, "student1@edumind.local")

    assert first.status_code == 200
    assert duplicate.status_code == 409
    assert duplicate.json()["detail"] == "A user with this email already exists."


def test_duplicate_real_phone_returns_clean_error(client):
    first = create_user(client, "student1@edumind.local", phone="9999999999")
    duplicate = create_user(client, "student2@edumind.local", phone="9999999999")

    assert first.status_code == 200
    assert duplicate.status_code == 409
    assert duplicate.json()["detail"] == (
        "A user with this phone number already exists."
    )


def test_parent_profile_blank_phone_becomes_none(client):
    user = create_user(client, "parent1@edumind.local", role="PARENT").json()

    response = client.post(
        "/api/v1/users/parent-profiles",
        json={
            "user_id": user["id"],
            "display_name": "Pilot Parent",
            "phone": " ",
        },
    )
    data = response.json()

    assert response.status_code == 200
    assert data["phone"] is None


def test_duplicate_student_profile_returns_clean_error(client):
    user = create_user(client, "student1@edumind.local").json()
    payload = {
        "user_id": user["id"],
        "display_name": "Pilot Student",
        "guardian_contact": None,
    }

    first = client.post("/api/v1/users/student-profiles", json=payload)
    duplicate = client.post("/api/v1/users/student-profiles", json=payload)

    assert first.status_code == 200
    assert duplicate.status_code == 409
    assert duplicate.json()["detail"] == "Profile already exists for this user."


def test_duplicate_teacher_profile_returns_clean_error(client):
    user = create_user(client, "teacher1@edumind.local", role="TEACHER").json()
    payload = {
        "user_id": user["id"],
        "display_name": "Pilot Teacher",
    }

    first = client.post("/api/v1/users/teacher-profiles", json=payload)
    duplicate = client.post("/api/v1/users/teacher-profiles", json=payload)

    assert first.status_code == 200
    assert duplicate.status_code == 409
    assert duplicate.json()["detail"] == "Profile already exists for this user."


def test_duplicate_parent_profile_returns_clean_error(client):
    user = create_user(client, "parent1@edumind.local", role="PARENT").json()
    payload = {
        "user_id": user["id"],
        "display_name": "Pilot Parent",
        "phone": "",
    }

    first = client.post("/api/v1/users/parent-profiles", json=payload)
    duplicate = client.post("/api/v1/users/parent-profiles", json=payload)

    assert first.status_code == 200
    assert duplicate.status_code == 409
    assert duplicate.json()["detail"] == "Profile already exists for this user."
