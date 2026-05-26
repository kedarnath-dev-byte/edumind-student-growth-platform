"""
Database models for the EduMind Student Growth Platform MVP.

These models support the first student loop: daily learning logs,
automatic spaced revision tasks, and healthy reward events.
"""

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text

from core.database import Base


class User(Base):
    """Minimal user record. Auth will be added later."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    role = Column(String, index=True, nullable=False)
    school_id = Column(Integer, index=True, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class School(Base):
    """School or college using EduMind."""

    __tablename__ = "schools"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    city = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Classroom(Base):
    """A school class, section, or batch."""

    __tablename__ = "classrooms"

    id = Column(Integer, primary_key=True, index=True)
    school_id = Column(Integer, index=True, nullable=True)
    name = Column(String, nullable=False)
    grade = Column(String, nullable=True)
    section = Column(String, nullable=True)
    academic_year = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Subject(Base):
    """A subject taught inside a school."""

    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    school_id = Column(Integer, index=True, nullable=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Topic(Base):
    """A topic within a subject."""

    __tablename__ = "topics"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, index=True, nullable=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class LearningLog(Base):
    """Student's daily reflection on what was taught and understood."""

    __tablename__ = "learning_logs"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, index=True, nullable=False)
    school_id = Column(Integer, index=True, nullable=True)
    classroom_id = Column(Integer, index=True, nullable=True)
    subject_id = Column(Integer, index=True, nullable=True)
    topic_id = Column(Integer, index=True, nullable=True)
    taught_today = Column(Text, nullable=False)
    understood = Column(Text, nullable=False)
    not_understood = Column(Text, nullable=True)
    confidence_level = Column(String, default="MEDIUM")
    created_at = Column(DateTime, default=datetime.utcnow)


class RevisionTask(Base):
    """A spaced revision task generated from a learning log."""

    __tablename__ = "revision_tasks"

    id = Column(Integer, primary_key=True, index=True)
    learning_log_id = Column(Integer, index=True, nullable=False)
    student_id = Column(Integer, index=True, nullable=False)
    revision_stage = Column(String, index=True, nullable=False)
    due_at = Column(DateTime, index=True, nullable=False)
    status = Column(String, index=True, default="PENDING")
    difficulty_after_revision = Column(String, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class RewardEvent(Base):
    """Healthy reward signal for consistency, honesty, and revision."""

    __tablename__ = "reward_events"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, index=True, nullable=False)
    learning_log_id = Column(Integer, index=True, nullable=True)
    revision_task_id = Column(Integer, index=True, nullable=True)
    event_type = Column(String, index=True, nullable=False)
    points = Column(Integer, default=0)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class RevisionAttempt(Base):
    """Permanent proof/history for a completed revision."""

    __tablename__ = "revision_attempts"

    id = Column(Integer, primary_key=True, index=True)
    revision_task_id = Column(Integer, index=True, nullable=False)
    student_id = Column(Integer, index=True, nullable=False)
    learning_log_id = Column(Integer, index=True, nullable=False)
    attempt_number = Column(Integer, default=1)
    completed_at = Column(DateTime, nullable=False)
    completed_on_due_date = Column(Boolean, default=False)
    days_late = Column(Integer, default=0)
    difficulty_after_revision = Column(String, nullable=True)
    revision_text_summary = Column(Text, nullable=True)
    revision_video_url = Column(String, nullable=True)
    points_awarded = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
