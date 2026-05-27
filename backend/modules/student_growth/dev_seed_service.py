"""Development-only seed data for local Student Growth testing."""

from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from modules.student_growth.learning_log_service import LearningLogService
from modules.student_growth.models import Classroom, School, Subject, Topic
from modules.student_growth.schemas import LearningLogCreate


class DevSeedService:
    """Creates repeatable demo data for local development."""

    SCHOOL_NAME = "EduMind Public School"
    SCHOOL_CITY = "Hyderabad"
    CLASSROOM_NAME = "Class 8 A"
    CLASSROOM_GRADE = "8"
    CLASSROOM_SECTION = "A"
    ACADEMIC_YEAR = "2026-2027"
    SUBJECT_NAME = "Physics"
    TOPIC_NAME = "Newton's First Law"
    STUDENT_ID = 1

    def __init__(self, db: Session):
        self.db = db

    def seed_demo_data(self) -> dict:
        school = self._get_or_create_school()
        classroom = self._get_or_create_classroom(school.id)
        subject = self._get_or_create_subject(school.id)
        topic = self._get_or_create_topic(subject.id)

        result = LearningLogService(self.db).create_learning_log(
            LearningLogCreate(
                student_id=self.STUDENT_ID,
                school_id=school.id,
                classroom_id=classroom.id,
                subject_id=subject.id,
                topic_id=topic.id,
                taught_today="Newton's first law is an interesting topic.",
                understood=(
                    "I understood that an object continues in rest or motion "
                    "unless external force acts on it."
                ),
                not_understood=(
                    "I need more practical examples about inertia and the bus "
                    "sudden-stop example."
                ),
                confidence_level="MEDIUM",
            )
        )

        revision_tasks = self._adjust_revision_dates(result["revision_tasks"])

        return {
            "status": "success",
            "message": "Demo seed data ready",
            "school_id": school.id,
            "classroom_id": classroom.id,
            "subject_id": subject.id,
            "topic_id": topic.id,
            "learning_log_id": result["learning_log"].id,
            "revision_task_ids": [task.id for task in revision_tasks],
            "reward_ids": [reward.id for reward in result["rewards"]],
        }

    def _get_or_create_school(self) -> School:
        school = (
            self.db.query(School)
            .filter(School.name == self.SCHOOL_NAME)
            .first()
        )
        if school:
            return school

        school = School(name=self.SCHOOL_NAME, city=self.SCHOOL_CITY)
        self.db.add(school)
        self.db.commit()
        self.db.refresh(school)
        return school

    def _get_or_create_classroom(self, school_id: int) -> Classroom:
        classroom = (
            self.db.query(Classroom)
            .filter(
                Classroom.school_id == school_id,
                Classroom.name == self.CLASSROOM_NAME,
                Classroom.grade == self.CLASSROOM_GRADE,
                Classroom.section == self.CLASSROOM_SECTION,
                Classroom.academic_year == self.ACADEMIC_YEAR,
            )
            .first()
        )
        if classroom:
            return classroom

        classroom = Classroom(
            school_id=school_id,
            name=self.CLASSROOM_NAME,
            grade=self.CLASSROOM_GRADE,
            section=self.CLASSROOM_SECTION,
            academic_year=self.ACADEMIC_YEAR,
        )
        self.db.add(classroom)
        self.db.commit()
        self.db.refresh(classroom)
        return classroom

    def _get_or_create_subject(self, school_id: int) -> Subject:
        subject = (
            self.db.query(Subject)
            .filter(
                Subject.school_id == school_id,
                Subject.name == self.SUBJECT_NAME,
            )
            .first()
        )
        if subject:
            return subject

        subject = Subject(school_id=school_id, name=self.SUBJECT_NAME)
        self.db.add(subject)
        self.db.commit()
        self.db.refresh(subject)
        return subject

    def _get_or_create_topic(self, subject_id: int) -> Topic:
        topic = (
            self.db.query(Topic)
            .filter(
                Topic.subject_id == subject_id,
                Topic.name == self.TOPIC_NAME,
            )
            .first()
        )
        if topic:
            return topic

        topic = Topic(subject_id=subject_id, name=self.TOPIC_NAME)
        self.db.add(topic)
        self.db.commit()
        self.db.refresh(topic)
        return topic

    def _adjust_revision_dates(self, revision_tasks: list) -> list:
        tasks_by_stage = {task.revision_stage: task for task in revision_tasks}
        today = datetime.utcnow().replace(hour=9, minute=0, second=0, microsecond=0)
        stage_dates = {
            "24H": today - timedelta(days=1),
            "7D": today,
            "1M": today + timedelta(days=1),
            "3M": today + timedelta(days=3),
            "6M": today + timedelta(days=10),
        }

        for stage, due_at in stage_dates.items():
            task = tasks_by_stage.get(stage)
            if task:
                task.due_at = due_at
                task.status = "PENDING"

        self.db.commit()
        for task in revision_tasks:
            self.db.refresh(task)
        return revision_tasks
