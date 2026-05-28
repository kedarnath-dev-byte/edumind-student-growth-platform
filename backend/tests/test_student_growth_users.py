"""Tests for pilot users, profiles, and role links."""

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


def create_user(client, name, role, email):
    response = client.post(
        "/api/v1/users",
        json={
            "full_name": name,
            "email": email,
            "phone": None,
            "role": role,
        },
    )
    assert response.status_code == 200
    return response.json()


def create_school(client):
    response = client.post(
        "/api/v1/schools",
        json={"name": "EduMind Public School", "city": "Hyderabad"},
    )
    assert response.status_code == 200
    return response.json()


def create_classroom(client, school_id):
    response = client.post(
        "/api/v1/classrooms",
        json={
            "school_id": school_id,
            "name": "Class 8 A",
            "grade": "8",
            "section": "A",
            "academic_year": "2026-2027",
        },
    )
    assert response.status_code == 200
    return response.json()


def create_student_profile(client, user_id, school_id=None, classroom_id=None):
    response = client.post(
        "/api/v1/users/student-profiles",
        json={
            "user_id": user_id,
            "school_id": school_id,
            "classroom_id": classroom_id,
            "display_name": "Demo Student",
            "guardian_contact": "Parent phone",
        },
    )
    assert response.status_code == 200
    return response.json()


def create_teacher_profile(client, user_id, school_id=None):
    response = client.post(
        "/api/v1/users/teacher-profiles",
        json={
            "user_id": user_id,
            "school_id": school_id,
            "display_name": "Demo Teacher",
        },
    )
    assert response.status_code == 200
    return response.json()


def create_parent_profile(client, user_id):
    response = client.post(
        "/api/v1/users/parent-profiles",
        json={
            "user_id": user_id,
            "display_name": "Demo Parent",
            "phone": "9999999999",
        },
    )
    assert response.status_code == 200
    return response.json()


def test_create_app_user_for_student(client):
    user = create_user(client, "Demo Student", "STUDENT", "student1@example.com")

    assert user["id"]
    assert user["full_name"] == "Demo Student"
    assert user["role"] == "STUDENT"
    assert user["status"] == "ACTIVE"


def test_create_app_user_for_teacher(client):
    user = create_user(client, "Demo Teacher", "TEACHER", "teacher1@example.com")

    assert user["role"] == "TEACHER"


def test_create_app_user_for_parent(client):
    user = create_user(client, "Demo Parent", "PARENT", "parent1@example.com")

    assert user["role"] == "PARENT"


def test_list_users_by_role(client):
    student = create_user(client, "Demo Student", "STUDENT", "student1@example.com")
    create_user(client, "Demo Teacher", "TEACHER", "teacher1@example.com")

    response = client.get("/api/v1/users?role=STUDENT")
    data = response.json()

    assert response.status_code == 200
    assert len(data) == 1
    assert data[0]["id"] == student["id"]
    assert data[0]["role"] == "STUDENT"


def test_create_student_profile_linked_to_app_user(client):
    school = create_school(client)
    classroom = create_classroom(client, school["id"])
    student_user = create_user(
        client,
        "Demo Student",
        "STUDENT",
        "student1@example.com",
    )

    profile = create_student_profile(
        client,
        student_user["id"],
        school_id=school["id"],
        classroom_id=classroom["id"],
    )

    assert profile["user_id"] == student_user["id"]
    assert profile["school_id"] == school["id"]
    assert profile["classroom_id"] == classroom["id"]


def test_create_teacher_profile_linked_to_app_user(client):
    school = create_school(client)
    teacher_user = create_user(
        client,
        "Demo Teacher",
        "TEACHER",
        "teacher1@example.com",
    )

    profile = create_teacher_profile(client, teacher_user["id"], school_id=school["id"])

    assert profile["user_id"] == teacher_user["id"]
    assert profile["school_id"] == school["id"]


def test_create_parent_profile_linked_to_app_user(client):
    parent_user = create_user(client, "Demo Parent", "PARENT", "parent1@example.com")

    profile = create_parent_profile(client, parent_user["id"])

    assert profile["user_id"] == parent_user["id"]
    assert profile["display_name"] == "Demo Parent"


def test_link_parent_to_student(client):
    student_user = create_user(client, "Demo Student", "STUDENT", "student1@example.com")
    parent_user = create_user(client, "Demo Parent", "PARENT", "parent1@example.com")
    student_profile = create_student_profile(client, student_user["id"])
    parent_profile = create_parent_profile(client, parent_user["id"])

    response = client.post(
        "/api/v1/users/parent-student-links",
        json={
            "parent_profile_id": parent_profile["id"],
            "student_profile_id": student_profile["id"],
            "relationship": "parent",
        },
    )
    link = response.json()

    assert response.status_code == 200
    assert link["parent_profile_id"] == parent_profile["id"]
    assert link["student_profile_id"] == student_profile["id"]
    assert link["status"] == "ACTIVE"


def test_link_student_to_classroom(client):
    school = create_school(client)
    classroom = create_classroom(client, school["id"])
    student_user = create_user(client, "Demo Student", "STUDENT", "student1@example.com")
    student_profile = create_student_profile(client, student_user["id"])

    response = client.post(
        "/api/v1/users/classroom-students",
        json={
            "classroom_id": classroom["id"],
            "student_profile_id": student_profile["id"],
        },
    )
    link = response.json()

    assert response.status_code == 200
    assert link["classroom_id"] == classroom["id"]
    assert link["student_profile_id"] == student_profile["id"]


def test_link_teacher_to_classroom(client):
    school = create_school(client)
    classroom = create_classroom(client, school["id"])
    teacher_user = create_user(client, "Demo Teacher", "TEACHER", "teacher1@example.com")
    teacher_profile = create_teacher_profile(client, teacher_user["id"], school["id"])

    response = client.post(
        "/api/v1/users/teacher-classrooms",
        json={
            "teacher_profile_id": teacher_profile["id"],
            "classroom_id": classroom["id"],
        },
    )
    link = response.json()

    assert response.status_code == 200
    assert link["teacher_profile_id"] == teacher_profile["id"]
    assert link["classroom_id"] == classroom["id"]


def test_get_parent_children_returns_linked_student(client):
    student_user = create_user(client, "Demo Student", "STUDENT", "student1@example.com")
    parent_user = create_user(client, "Demo Parent", "PARENT", "parent1@example.com")
    student_profile = create_student_profile(client, student_user["id"])
    parent_profile = create_parent_profile(client, parent_user["id"])
    client.post(
        "/api/v1/users/parent-student-links",
        json={
            "parent_profile_id": parent_profile["id"],
            "student_profile_id": student_profile["id"],
            "relationship": "parent",
        },
    )

    response = client.get(
        f"/api/v1/users/parent-profiles/{parent_profile['id']}/children"
    )
    children = response.json()

    assert response.status_code == 200
    assert len(children) == 1
    assert children[0]["id"] == student_profile["id"]


def test_get_teacher_classrooms_returns_linked_classroom(client):
    school = create_school(client)
    classroom = create_classroom(client, school["id"])
    teacher_user = create_user(client, "Demo Teacher", "TEACHER", "teacher1@example.com")
    teacher_profile = create_teacher_profile(client, teacher_user["id"], school["id"])
    client.post(
        "/api/v1/users/teacher-classrooms",
        json={
            "teacher_profile_id": teacher_profile["id"],
            "classroom_id": classroom["id"],
        },
    )

    response = client.get(
        f"/api/v1/users/teacher-profiles/{teacher_profile['id']}/classrooms"
    )
    classrooms = response.json()

    assert response.status_code == 200
    assert len(classrooms) == 1
    assert classrooms[0]["id"] == classroom["id"]
