"""Service layer for school setup dropdown data."""

from datetime import datetime
from typing import List

from sqlalchemy.orm import Session

from modules.student_growth.models import (
    Classroom,
    ClassroomStudent,
    LearningLog,
    School,
    StudentProfile,
    Subject,
    TeacherClassroom,
    TeacherProfile,
    Topic,
)
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

    @staticmethod
    def _ensure_created_at(entity):
        if getattr(entity, "created_at", None) is None:
            entity.created_at = datetime.utcnow()
        return entity

    def create_school(self, payload: SchoolCreate) -> School:
        school = School(**payload.model_dump())
        self._ensure_created_at(school)
        self.db.add(school)
        self.db.commit()
        self.db.refresh(school)
        return school

    def list_schools(self) -> List[School]:
        return (
            self.db.query(School)
            .order_by(School.created_at.desc().nullslast())
            .all()
        )

    def create_classroom(self, payload: ClassroomCreate) -> Classroom:
        classroom = Classroom(**payload.model_dump())
        self._ensure_created_at(classroom)
        self.db.add(classroom)
        self.db.commit()
        self.db.refresh(classroom)
        return classroom

    def list_classrooms(self) -> List[Classroom]:
        return (
            self.db.query(Classroom)
            .order_by(Classroom.created_at.desc().nullslast())
            .all()
        )

    def list_classrooms_by_school(self, school_id: int) -> List[Classroom]:
        return (
            self.db.query(Classroom)
            .filter(Classroom.school_id == school_id)
            .order_by(Classroom.created_at.desc().nullslast())
            .all()
        )

    def create_subject(self, payload: SubjectCreate) -> Subject:
        subject = Subject(**payload.model_dump())
        self._ensure_created_at(subject)
        self.db.add(subject)
        self.db.commit()
        self.db.refresh(subject)
        return subject

    def list_subjects(self) -> List[Subject]:
        return (
            self.db.query(Subject)
            .order_by(Subject.created_at.desc().nullslast())
            .all()
        )

    def list_subjects_by_school(self, school_id: int) -> List[Subject]:
        return (
            self.db.query(Subject)
            .filter(Subject.school_id == school_id)
            .order_by(Subject.created_at.desc().nullslast())
            .all()
        )

    def create_topic(self, payload: TopicCreate) -> Topic:
        topic = Topic(**payload.model_dump())
        self._ensure_created_at(topic)
        self.db.add(topic)
        self.db.commit()
        self.db.refresh(topic)
        return topic

    def list_topics(self) -> List[Topic]:
        return (
            self.db.query(Topic)
            .order_by(Topic.created_at.desc().nullslast())
            .all()
        )

    def list_topics_by_subject(self, subject_id: int) -> List[Topic]:
        return (
            self.db.query(Topic)
            .filter(Topic.subject_id == subject_id)
            .order_by(Topic.created_at.desc().nullslast())
            .all()
        )

    def delete_school(self, school_id: int) -> dict:
        """Delete a school and its curriculum; unlink students/teachers."""
        school = self.db.query(School).filter(School.id == school_id).first()
        if school is None:
            raise LookupError("School not found")

        classrooms = (
            self.db.query(Classroom)
            .filter(Classroom.school_id == school_id)
            .all()
        )
        classroom_ids = [c.id for c in classrooms]

        subjects = (
            self.db.query(Subject)
            .filter(Subject.school_id == school_id)
            .all()
        )
        subject_ids = [s.id for s in subjects]

        topics_deleted = 0
        if subject_ids:
            topics_deleted = (
                self.db.query(Topic)
                .filter(Topic.subject_id.in_(subject_ids))
                .delete(synchronize_session=False)
            )

        subjects_deleted = (
            self.db.query(Subject)
            .filter(Subject.school_id == school_id)
            .delete(synchronize_session=False)
        )

        classroom_students_deleted = 0
        teacher_classrooms_deleted = 0
        if classroom_ids:
            classroom_students_deleted = (
                self.db.query(ClassroomStudent)
                .filter(ClassroomStudent.classroom_id.in_(classroom_ids))
                .delete(synchronize_session=False)
            )
            teacher_classrooms_deleted = (
                self.db.query(TeacherClassroom)
                .filter(TeacherClassroom.classroom_id.in_(classroom_ids))
                .delete(synchronize_session=False)
            )

        # Unlink students assigned to this school / its classrooms
        students_unlinked = (
            self.db.query(StudentProfile)
            .filter(StudentProfile.school_id == school_id)
            .update(
                {"school_id": None, "classroom_id": None},
                synchronize_session=False,
            )
        )
        if classroom_ids:
            self.db.query(StudentProfile).filter(
                StudentProfile.classroom_id.in_(classroom_ids)
            ).update({"classroom_id": None}, synchronize_session=False)

        teachers_unlinked = (
            self.db.query(TeacherProfile)
            .filter(TeacherProfile.school_id == school_id)
            .update({"school_id": None}, synchronize_session=False)
        )

        # Keep learning logs; clear school pointer only
        self.db.query(LearningLog).filter(
            LearningLog.school_id == school_id
        ).update({"school_id": None}, synchronize_session=False)

        classrooms_deleted = (
            self.db.query(Classroom)
            .filter(Classroom.school_id == school_id)
            .delete(synchronize_session=False)
        )

        name = school.name
        self.db.delete(school)
        self.db.commit()

        return {
            "id": school_id,
            "name": name,
            "classrooms_deleted": classrooms_deleted,
            "subjects_deleted": subjects_deleted,
            "topics_deleted": topics_deleted,
            "classroom_students_deleted": classroom_students_deleted,
            "teacher_classrooms_deleted": teacher_classrooms_deleted,
            "students_unlinked": students_unlinked,
            "teachers_unlinked": teachers_unlinked,
        }

