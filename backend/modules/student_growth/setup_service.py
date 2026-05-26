"""Service layer for school setup dropdown data."""

from typing import List

from sqlalchemy.orm import Session

from modules.student_growth.models import Classroom, School, Subject, Topic
from modules.student_growth.setup_schemas import (
    ClassroomCreate,
    SchoolCreate,
    SubjectCreate,
    TopicCreate,
)


class SetupService:
    """Creates and lists school setup entities."""

    def __init__(self, db: Session):
        self.db = db

    def create_school(self, payload: SchoolCreate) -> School:
        school = School(**payload.model_dump())
        self.db.add(school)
        self.db.commit()
        self.db.refresh(school)
        return school

    def list_schools(self) -> List[School]:
        return self.db.query(School).order_by(School.created_at.desc()).all()

    def create_classroom(self, payload: ClassroomCreate) -> Classroom:
        classroom = Classroom(**payload.model_dump())
        self.db.add(classroom)
        self.db.commit()
        self.db.refresh(classroom)
        return classroom

    def list_classrooms(self) -> List[Classroom]:
        return self.db.query(Classroom).order_by(Classroom.created_at.desc()).all()

    def list_classrooms_by_school(self, school_id: int) -> List[Classroom]:
        return (
            self.db.query(Classroom)
            .filter(Classroom.school_id == school_id)
            .order_by(Classroom.created_at.desc())
            .all()
        )

    def create_subject(self, payload: SubjectCreate) -> Subject:
        subject = Subject(**payload.model_dump())
        self.db.add(subject)
        self.db.commit()
        self.db.refresh(subject)
        return subject

    def list_subjects(self) -> List[Subject]:
        return self.db.query(Subject).order_by(Subject.created_at.desc()).all()

    def list_subjects_by_school(self, school_id: int) -> List[Subject]:
        return (
            self.db.query(Subject)
            .filter(Subject.school_id == school_id)
            .order_by(Subject.created_at.desc())
            .all()
        )

    def create_topic(self, payload: TopicCreate) -> Topic:
        topic = Topic(**payload.model_dump())
        self.db.add(topic)
        self.db.commit()
        self.db.refresh(topic)
        return topic

    def list_topics(self) -> List[Topic]:
        return self.db.query(Topic).order_by(Topic.created_at.desc()).all()

    def list_topics_by_subject(self, subject_id: int) -> List[Topic]:
        return (
            self.db.query(Topic)
            .filter(Topic.subject_id == subject_id)
            .order_by(Topic.created_at.desc())
            .all()
        )
