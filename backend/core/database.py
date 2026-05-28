import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

load_dotenv()

SQLITE_DATABASE_URL = "sqlite:///./edumind.db"


def normalize_database_url(raw_url: str) -> str:
    """Normalize deployment Postgres URLs to the installed psycopg2 driver."""
    if raw_url.startswith("postgresql+psycopg2://"):
        return raw_url
    if raw_url.startswith("postgresql://"):
        return raw_url.replace("postgresql://", "postgresql+psycopg2://", 1)
    if raw_url.startswith("postgres://"):
        return raw_url.replace("postgres://", "postgresql+psycopg2://", 1)
    return raw_url


def get_database_url() -> str:
    """Use DATABASE_URL when provided, otherwise keep local SQLite fallback."""
    raw_url = os.getenv("DATABASE_URL") or SQLITE_DATABASE_URL
    return normalize_database_url(raw_url)


DATABASE_URL = get_database_url()

engine_kwargs = {}
if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    engine_kwargs["pool_pre_ping"] = True

engine = create_engine(DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# All ORM models inherit from this Base.
Base = declarative_base()


def get_db():
    """
    FastAPI dependency that yields a DB session per request.
    Automatically closes session when request is done.
    Usage: db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Creates all tables in the database.
    Called once on application startup.
    Safe to call multiple times and skips existing tables.
    """
    # Import all models here so Base knows about them before create_all().
    from modules.evaluation.models import (  # noqa: F401
        APIMetric,
        DocumentHistory,
        QuestionHistory,
        RAGEvaluation,
        StudentSession,
    )
    from modules.student_growth.models import (  # noqa: F401
        AppUser,
        Classroom,
        ClassroomStudent,
        LearningLog,
        ParentProfile,
        ParentStudentLink,
        PeerHelpOffer,
        PeerHelpRequest,
        PeerHelpSession,
        RewardEvent,
        RevisionAttempt,
        RevisionTask,
        School,
        StudentProfile,
        Subject,
        TeacherClassroom,
        TeacherProfile,
        Topic,
        User,
    )

    Base.metadata.create_all(bind=engine)
