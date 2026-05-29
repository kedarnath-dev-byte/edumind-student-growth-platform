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


class AppUser(Base):
    """Pilot-ready user identity without auth credentials yet."""

    __tablename__ = "app_users"

    id = Column(Integer, primary_key=True, index=True)
    supabase_user_id = Column(String, unique=True, index=True, nullable=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    phone = Column(String, unique=True, index=True, nullable=True)
    role = Column(String, index=True, nullable=False)
    status = Column(String, index=True, default="ACTIVE")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True)


class StudentProfile(Base):
    """Privacy-safe student profile linked to an AppUser."""

    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    school_id = Column(Integer, index=True, nullable=True)
    classroom_id = Column(Integer, index=True, nullable=True)
    display_name = Column(String, nullable=False)
    guardian_contact = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True)


class TeacherProfile(Base):
    """Teacher profile linked to an AppUser."""

    __tablename__ = "teacher_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    school_id = Column(Integer, index=True, nullable=True)
    display_name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True)


class ParentProfile(Base):
    """Parent or guardian profile linked to an AppUser."""

    __tablename__ = "parent_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    display_name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True)


class ParentStudentLink(Base):
    """Safe parent-to-student relationship mapping."""

    __tablename__ = "parent_student_links"

    id = Column(Integer, primary_key=True, index=True)
    parent_profile_id = Column(Integer, index=True, nullable=False)
    student_profile_id = Column(Integer, index=True, nullable=False)
    relationship = Column(String, nullable=True)
    status = Column(String, index=True, default="ACTIVE")
    created_at = Column(DateTime, default=datetime.utcnow)


class ClassroomStudent(Base):
    """Classroom membership for a student profile."""

    __tablename__ = "classroom_students"

    id = Column(Integer, primary_key=True, index=True)
    classroom_id = Column(Integer, index=True, nullable=False)
    student_profile_id = Column(Integer, index=True, nullable=False)
    status = Column(String, index=True, default="ACTIVE")
    created_at = Column(DateTime, default=datetime.utcnow)


class TeacherClassroom(Base):
    """Classroom assignment for a teacher profile."""

    __tablename__ = "teacher_classrooms"

    id = Column(Integer, primary_key=True, index=True)
    teacher_profile_id = Column(Integer, index=True, nullable=False)
    classroom_id = Column(Integer, index=True, nullable=False)
    status = Column(String, index=True, default="ACTIVE")
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


class PeerHelpRequest(Base):
    """A safe request for peer support on a topic."""

    __tablename__ = "peer_help_requests"

    id = Column(Integer, primary_key=True, index=True)
    requester_student_id = Column(Integer, index=True, nullable=False)
    school_id = Column(Integer, index=True, nullable=False)
    classroom_id = Column(Integer, index=True, nullable=False)
    subject_id = Column(Integer, index=True, nullable=False)
    topic_id = Column(Integer, index=True, nullable=False)
    learning_log_id = Column(Integer, index=True, nullable=True)
    message = Column(Text, nullable=False)
    status = Column(String, index=True, default="OPEN")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True)


class PeerHelpOffer(Base):
    """A student's offer to explain a topic to peers."""

    __tablename__ = "peer_help_offers"

    id = Column(Integer, primary_key=True, index=True)
    helper_student_id = Column(Integer, index=True, nullable=False)
    school_id = Column(Integer, index=True, nullable=False)
    classroom_id = Column(Integer, index=True, nullable=False)
    subject_id = Column(Integer, index=True, nullable=False)
    topic_id = Column(Integer, index=True, nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String, index=True, default="AVAILABLE")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True)


class PeerHelpSession(Base):
    """A peer learning session between a requester and a helper."""

    __tablename__ = "peer_help_sessions"

    id = Column(Integer, primary_key=True, index=True)
    help_request_id = Column(Integer, index=True, nullable=False)
    help_offer_id = Column(Integer, index=True, nullable=True)
    requester_student_id = Column(Integer, index=True, nullable=False)
    helper_student_id = Column(Integer, index=True, nullable=False)
    school_id = Column(Integer, index=True, nullable=False)
    classroom_id = Column(Integer, index=True, nullable=False)
    subject_id = Column(Integer, index=True, nullable=False)
    topic_id = Column(Integer, index=True, nullable=False)
    status = Column(String, index=True, default="ACTIVE")
    requester_feedback = Column(Text, nullable=True)
    helper_reflection = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
