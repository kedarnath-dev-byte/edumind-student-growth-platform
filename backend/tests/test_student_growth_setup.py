"""Tests for school setup APIs and services."""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from core.database import Base
from modules.student_growth.setup_schemas import (
    ClassroomCreate,
    SchoolCreate,
    SubjectCreate,
    TopicCreate,
)
from modules.student_growth.setup_service import SetupService


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


@pytest.fixture(scope="function")
def service(db_session):
    return SetupService(db_session)


def test_create_school(service):
    school = service.create_school(SchoolCreate(name="EduMind Public School", city="Hyderabad"))

    assert school.id is not None
    assert school.name == "EduMind Public School"
    assert school.city == "Hyderabad"


def test_create_classroom_linked_to_school(service):
    school = service.create_school(SchoolCreate(name="EduMind Public School"))
    classroom = service.create_classroom(
        ClassroomCreate(
            school_id=school.id,
            name="Class 8 A",
            grade="8",
            section="A",
            academic_year="2026-2027",
        )
    )

    assert classroom.id is not None
    assert classroom.school_id == school.id
    assert classroom.name == "Class 8 A"


def test_create_subject_linked_to_school(service):
    school = service.create_school(SchoolCreate(name="EduMind Public School"))
    subject = service.create_subject(SubjectCreate(school_id=school.id, name="Science"))

    assert subject.id is not None
    assert subject.school_id == school.id
    assert subject.name == "Science"


def test_create_topic_linked_to_subject(service):
    school = service.create_school(SchoolCreate(name="EduMind Public School"))
    subject = service.create_subject(SubjectCreate(school_id=school.id, name="Physics"))
    topic = service.create_topic(
        TopicCreate(subject_id=subject.id, name="Newton's First Law")
    )

    assert topic.id is not None
    assert topic.subject_id == subject.id
    assert topic.name == "Newton's First Law"


def test_list_classrooms_by_school(service):
    school = service.create_school(SchoolCreate(name="EduMind Public School"))
    other_school = service.create_school(SchoolCreate(name="Other School"))
    service.create_classroom(
        ClassroomCreate(
            school_id=school.id,
            name="Class 8 A",
            grade="8",
            section="A",
            academic_year="2026-2027",
        )
    )
    service.create_classroom(
        ClassroomCreate(
            school_id=other_school.id,
            name="Class 9 B",
            grade="9",
            section="B",
            academic_year="2026-2027",
        )
    )

    classrooms = service.list_classrooms_by_school(school.id)

    assert len(classrooms) == 1
    assert classrooms[0].school_id == school.id


def test_list_subjects_by_school(service):
    school = service.create_school(SchoolCreate(name="EduMind Public School"))
    other_school = service.create_school(SchoolCreate(name="Other School"))
    service.create_subject(SubjectCreate(school_id=school.id, name="Science"))
    service.create_subject(SubjectCreate(school_id=other_school.id, name="Math"))

    subjects = service.list_subjects_by_school(school.id)

    assert len(subjects) == 1
    assert subjects[0].school_id == school.id
    assert subjects[0].name == "Science"


def test_list_topics_by_subject(service):
    school = service.create_school(SchoolCreate(name="EduMind Public School"))
    subject = service.create_subject(SubjectCreate(school_id=school.id, name="Physics"))
    other_subject = service.create_subject(SubjectCreate(school_id=school.id, name="Biology"))
    service.create_topic(TopicCreate(subject_id=subject.id, name="Newton's First Law"))
    service.create_topic(TopicCreate(subject_id=other_subject.id, name="Photosynthesis"))

    topics = service.list_topics_by_subject(subject.id)

    assert len(topics) == 1
    assert topics[0].subject_id == subject.id
    assert topics[0].name == "Newton's First Law"
