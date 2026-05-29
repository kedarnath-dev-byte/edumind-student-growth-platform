"""Tests for Supabase Auth to EduMind AppUser/profile mapping."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from core.auth import get_current_supabase_user
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


def override_auth_payload(sub="supabase-user-1", email="student1@edumind.local"):
    async def _override():
        return {
            "sub": sub,
            "email": email,
            "role": "authenticated",
            "aud": "authenticated",
        }

    return _override


def create_user(client, name, role, email, supabase_user_id=None):
    response = client.post(
        "/api/v1/users",
        json={
            "supabase_user_id": supabase_user_id,
            "full_name": name,
            "email": email,
            "phone": None,
            "role": role,
        },
    )
    assert response.status_code == 200
    return response.json()


def create_school_and_classroom(client):
    school = client.post(
        "/api/v1/schools",
        json={"name": "EduMind Public School", "city": "Hyderabad"},
    ).json()
    classroom = client.post(
        "/api/v1/classrooms",
        json={
            "school_id": school["id"],
            "name": "Class 8 A",
            "grade": "8",
            "section": "A",
            "academic_year": "2026-2027",
        },
    ).json()
    return school, classroom


def create_student_profile(client, user_id, school_id=None, classroom_id=None):
    return client.post(
        "/api/v1/users/student-profiles",
        json={
            "user_id": user_id,
            "school_id": school_id,
            "classroom_id": classroom_id,
            "display_name": "Demo Student",
            "guardian_contact": "Parent contact",
        },
    ).json()


def test_app_user_can_be_created_with_supabase_user_id(client):
    user = create_user(
        client,
        "Demo Student",
        "STUDENT",
        "student1@edumind.local",
        supabase_user_id="supabase-user-1",
    )

    assert user["supabase_user_id"] == "supabase-user-1"
    assert user["role"] == "STUDENT"


def test_me_profile_returns_linked_student_user_and_profile(client):
    school, classroom = create_school_and_classroom(client)
    user = create_user(
        client,
        "Demo Student",
        "STUDENT",
        "student1@edumind.local",
        supabase_user_id="supabase-user-1",
    )
    profile = create_student_profile(client, user["id"], school["id"], classroom["id"])
    app.dependency_overrides[get_current_supabase_user] = override_auth_payload()

    response = client.get("/api/v1/auth/me/profile")
    data = response.json()

    assert response.status_code == 200
    assert data["app_user"]["id"] == user["id"]
    assert data["student_profile"]["id"] == profile["id"]
    assert data["parent_profile"] is None
    assert data["teacher_profile"] is None


def test_me_profile_returns_linked_parent_user_and_children(client):
    student_user = create_user(
        client,
        "Demo Student",
        "STUDENT",
        "student1@edumind.local",
        supabase_user_id="supabase-student",
    )
    parent_user = create_user(
        client,
        "Demo Parent",
        "PARENT",
        "parent1@edumind.local",
        supabase_user_id="supabase-parent",
    )
    student_profile = create_student_profile(client, student_user["id"])
    parent_profile = client.post(
        "/api/v1/users/parent-profiles",
        json={
            "user_id": parent_user["id"],
            "display_name": "Demo Parent",
            "phone": "9999999999",
        },
    ).json()
    client.post(
        "/api/v1/users/parent-student-links",
        json={
            "parent_profile_id": parent_profile["id"],
            "student_profile_id": student_profile["id"],
            "relationship": "parent",
        },
    )
    app.dependency_overrides[get_current_supabase_user] = override_auth_payload(
        sub="supabase-parent",
        email="parent1@edumind.local",
    )

    response = client.get("/api/v1/auth/me/profile")
    data = response.json()

    assert response.status_code == 200
    assert data["parent_profile"]["id"] == parent_profile["id"]
    assert len(data["parent_children"]) == 1
    assert data["parent_children"][0]["id"] == student_profile["id"]


def test_me_profile_returns_linked_teacher_user_and_classrooms(client):
    school, classroom = create_school_and_classroom(client)
    teacher_user = create_user(
        client,
        "Demo Teacher",
        "TEACHER",
        "teacher1@edumind.local",
        supabase_user_id="supabase-teacher",
    )
    teacher_profile = client.post(
        "/api/v1/users/teacher-profiles",
        json={
            "user_id": teacher_user["id"],
            "school_id": school["id"],
            "display_name": "Demo Teacher",
        },
    ).json()
    client.post(
        "/api/v1/users/teacher-classrooms",
        json={
            "teacher_profile_id": teacher_profile["id"],
            "classroom_id": classroom["id"],
        },
    )
    app.dependency_overrides[get_current_supabase_user] = override_auth_payload(
        sub="supabase-teacher",
        email="teacher1@edumind.local",
    )

    response = client.get("/api/v1/auth/me/profile")
    data = response.json()

    assert response.status_code == 200
    assert data["teacher_profile"]["id"] == teacher_profile["id"]
    assert len(data["teacher_classrooms"]) == 1
    assert data["teacher_classrooms"][0]["id"] == classroom["id"]


def test_email_fallback_links_app_user_when_supabase_id_is_null(client):
    user = create_user(
        client,
        "Demo Student",
        "STUDENT",
        "student1@edumind.local",
    )
    create_student_profile(client, user["id"])
    app.dependency_overrides[get_current_supabase_user] = override_auth_payload(
        sub="new-supabase-id",
        email="student1@edumind.local",
    )

    response = client.get("/api/v1/auth/me/profile")
    data = response.json()

    assert response.status_code == 200
    assert data["app_user"]["supabase_user_id"] == "new-supabase-id"


def test_missing_app_user_returns_safe_not_linked_error(client):
    app.dependency_overrides[get_current_supabase_user] = override_auth_payload(
        sub="unknown-user",
        email="unknown@edumind.local",
    )

    response = client.get("/api/v1/auth/me/profile")

    assert response.status_code == 404
    assert response.json()["detail"] == (
        "EduMind user profile is not linked yet. Please contact EduMind admin."
    )


def test_link_current_user_updates_app_user_supabase_id(client):
    user = create_user(
        client,
        "Demo Student",
        "STUDENT",
        "student1@edumind.local",
    )
    app.dependency_overrides[get_current_supabase_user] = override_auth_payload(
        sub="linked-supabase-id",
        email="student1@edumind.local",
    )

    response = client.post(
        "/api/v1/auth/link-current-user",
        json={"app_user_id": user["id"]},
    )
    data = response.json()

    assert response.status_code == 200
    assert data["supabase_user_id"] == "linked-supabase-id"


def test_auth_me_still_returns_pure_auth_info_when_dependency_is_mocked(client):
    app.dependency_overrides[get_current_supabase_user] = override_auth_payload(
        sub="supabase-user-1",
        email="student1@edumind.local",
    )

    response = client.get("/api/v1/auth/me")
    data = response.json()

    assert response.status_code == 200
    assert data == {
        "authenticated": True,
        "supabase_user_id": "supabase-user-1",
        "email": "student1@edumind.local",
        "role": "authenticated",
        "aud": "authenticated",
    }
