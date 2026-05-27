"""
@module    main
@description FastAPI application entry point for EduMind AI backend.
             Registers all routers, attaches middleware, and initialises
             the database on startup.
             Run with: uvicorn backend.main:app --reload
@author    EduMind AI Engineering
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from modules.health.health_controller import router as health_router
from modules.ingestion.ingestion_controller import router as ingestion_router
from modules.rag.rag_controller import router as rag_router

from core.database import init_db
from modules.evaluation.evaluation_controller import router as evaluation_router
from modules.evaluation.timing_middleware import TimingMiddleware
from modules.student_growth.dev_seed_controller import router as dev_seed_router
from modules.student_growth.habit_controller import router as habit_router
from modules.student_growth.learning_log_controller import router as learning_log_router
from modules.student_growth.revision_controller import router as revision_router
from modules.student_growth.setup_controller import router as setup_router

# ─── App Instance ─────────────────────────────────────────────────────────────
app = FastAPI(
    title="EduMind AI",
    description="RAG + LangGraph + Fine-Tuning Education Platform",
    version="1.0.0",
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production
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
app.include_router(habit_router)
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



