"""
@module    core.database
@description SQLAlchemy database engine, session factory, and Base class.
             All ORM models inherit from Base defined here.
             Call create_all() on startup to auto-create tables.
             Supports SQLite (dev) → PostgreSQL (prod) via .env switch.
@author    EduMind AI Engineering
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# ─── Database URL ─────────────────────────────────────────────────────────────
# Reads from .env — defaults to SQLite for local dev
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./edumind.db")

# ─── Engine ───────────────────────────────────────────────────────────────────
# connect_args only needed for SQLite (disables same-thread check)
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)

# ─── Session Factory ──────────────────────────────────────────────────────────
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ─── Base Class ───────────────────────────────────────────────────────────────
# All ORM models inherit from this Base
Base = declarative_base()


# ─── Dependency Injection ─────────────────────────────────────────────────────
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


# ─── Table Creation ───────────────────────────────────────────────────────────
def init_db():
    """
    Creates all tables in the database.
    Called once on application startup.
    Safe to call multiple times — skips existing tables.
    """
    # Import all models here so Base knows about them before create_all()
    from modules.evaluation.models import (  # noqa: F401
        StudentSession,
        DocumentHistory,
        QuestionHistory,
        RAGEvaluation,
        APIMetric,
    )
    from modules.student_growth.models import (  # noqa: F401
        User,
        School,
        Classroom,
        Subject,
        Topic,
        LearningLog,
        RevisionTask,
        RewardEvent,
        RevisionAttempt,
    )
    Base.metadata.create_all(bind=engine)

