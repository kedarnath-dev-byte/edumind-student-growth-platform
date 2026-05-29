"""
@module    main
@description FastAPI application entry point for EduMind AI backend.
             Registers all routers, attaches middleware, and initialises
             the database on startup.
             Run with: uvicorn backend.main:app --reload
@author    EduMind AI Engineering
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from modules.health.health_controller import router as health_router
from modules.ingestion.ingestion_controller import router as ingestion_router
from modules.rag.rag_controller import router as rag_router

from core.database import init_db
from modules.evaluation.evaluation_controller import router as evaluation_router
from modules.evaluation.timing_middleware import TimingMiddleware
from modules.student_growth.dev_seed_controller import router as dev_seed_router
from modules.student_growth.auth_controller import router as auth_router
from modules.student_growth.habit_controller import router as habit_router
from modules.student_growth.learning_log_controller import router as learning_log_router
from modules.student_growth.parent_dashboard_controller import (
    router as parent_dashboard_router,
)
from modules.student_growth.peer_learning_controller import router as peer_learning_router
from modules.student_growth.revision_controller import router as revision_router
from modules.student_growth.setup_controller import router as setup_router
from modules.student_growth.teacher_dashboard_controller import (
    router as teacher_dashboard_router,
)
from modules.student_growth.user_controller import router as user_router

# ─── App Instance ─────────────────────────────────────────────────────────────
app = FastAPI(
    title="EduMind AI",
    description="RAG + LangGraph + Fine-Tuning Education Platform",
    version="1.0.0",
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
DEFAULT_CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://edumind-student-growth-platform.vercel.app",
]


def get_cors_origins():
    configured_origins = os.getenv("CORS_ORIGINS", "")
    extra_origins = [
        origin.strip()
        for origin in configured_origins.split(",")
        if origin.strip()
    ]
    return [*DEFAULT_CORS_ORIGINS, *extra_origins]


app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Timing Middleware ────────────────────────────────────────────────────────
app.add_middleware(TimingMiddleware)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(evaluation_router)
app.include_router(health_router, prefix="/api/v1", tags=["Health"])
app.include_router(ingestion_router)
app.include_router(rag_router)
app.include_router(learning_log_router)
app.include_router(revision_router)
app.include_router(setup_router)
app.include_router(dev_seed_router)
app.include_router(auth_router)
app.include_router(habit_router)
app.include_router(peer_learning_router)
app.include_router(teacher_dashboard_router)
app.include_router(parent_dashboard_router)
app.include_router(user_router)
# ─── Startup Event ────────────────────────────────────────────────────────────
@app.on_event("startup")
async def on_startup():
    """Create all DB tables on first run."""
    init_db()
    print("✅ EduMind AI started — database tables ready")


# ─── Root Health Check ────────────────────────────────────────────────────────
@app.get("/")
async def root():
    """Quick health check endpoint."""
    return {"status": "ok", "app": "EduMind AI", "version": "1.0.0"}



