"""
@module    evaluation.evaluation_controller
@description FastAPI router exposing all evaluation and monitoring endpoints.
             Follows Controller pattern — only handles HTTP in/out.
             All logic delegated to EvaluationService.
             Routes versioned under /api/v1/evaluation/
@author    EduMind AI Engineering
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.modules.evaluation.evaluation_service import EvaluationService

router = APIRouter(prefix="/api/v1/evaluation", tags=["Evaluation & Monitoring"])


# ─── Pydantic Request Schemas ─────────────────────────────────────────────────

class SessionStartRequest(BaseModel):
    student_email: str
    student_name: Optional[str] = None


class SessionEndRequest(BaseModel):
    session_id: int


class DocumentLogRequest(BaseModel):
    student_email: str
    filename: str
    file_type: str
    file_size_kb: float = 0.0
    chunk_count: int = 0
    status: str = "success"


class QuestionLogRequest(BaseModel):
    student_email: str
    question: str
    answer: str
    rag_type: str = "naive"
    agent_used: Optional[str] = None
    response_time_ms: float = 0.0
    context_chunks: int = 0


class APIMetricRequest(BaseModel):
    endpoint: str
    method: str
    status_code: int
    response_time_ms: float
    student_email: Optional[str] = None
    error_message: Optional[str] = None


# ─── Session Endpoints ────────────────────────────────────────────────────────

@router.post("/session/start")
async def start_session(request: SessionStartRequest, db: Session = Depends(get_db)):
    """Start tracking a student login session."""
    try:
        service = EvaluationService(db)
        result = service.start_student_session(
            email=request.student_email,
            name=request.student_name,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/session/end")
async def end_session(request: SessionEndRequest, db: Session = Depends(get_db)):
    """End a student session on logout."""
    try:
        service = EvaluationService(db)
        result = service.end_student_session(session_id=request.session_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Document Endpoints ───────────────────────────────────────────────────────

@router.post("/document/log")
async def log_document(request: DocumentLogRequest, db: Session = Depends(get_db)):
    """Log a document upload event for a student."""
    try:
        service = EvaluationService(db)
        result = service.log_document_upload(
            email=request.student_email,
            filename=request.filename,
            file_type=request.file_type,
            file_size_kb=request.file_size_kb,
            chunk_count=request.chunk_count,
            status=request.status,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/document/student/{email}")
async def get_student_documents(email: str, db: Session = Depends(get_db)):
    """Get all documents uploaded by a specific student."""
    try:
        service = EvaluationService(db)
        return service.get_student_documents(email=email)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Question Endpoints ───────────────────────────────────────────────────────

@router.post("/question/log")
async def log_question(request: QuestionLogRequest, db: Session = Depends(get_db)):
    """Log a student question, RAG answer, and auto-compute RAGAS scores."""
    try:
        service = EvaluationService(db)
        result = service.log_question_and_evaluate(
            email=request.student_email,
            question=request.question,
            answer=request.answer,
            rag_type=request.rag_type,
            agent_used=request.agent_used,
            response_time_ms=request.response_time_ms,
            context_chunks=request.context_chunks,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/question/student/{email}")
async def get_student_questions(email: str, db: Session = Depends(get_db)):
    """Get full question history for one student."""
    try:
        service = EvaluationService(db)
        return service.get_student_questions(email=email)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Admin Dashboard Endpoint ─────────────────────────────────────────────────

@router.get("/admin/dashboard")
async def get_admin_dashboard(db: Session = Depends(get_db)):
    """
    Admin-only endpoint: returns full system view.
    Includes: system health, all student sessions, document history,
    question history, average RAGAS scores, and API performance metrics.
    """
    try:
        service = EvaluationService(db)
        return service.get_admin_dashboard()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── API Metrics Endpoint ─────────────────────────────────────────────────────

@router.post("/metrics/log")
async def log_api_metric(request: APIMetricRequest, db: Session = Depends(get_db)):
    """Log an API call's response time and status code."""
    try:
        service = EvaluationService(db)
        result = service.log_api_metric(
            endpoint=request.endpoint,
            method=request.method,
            status_code=request.status_code,
            response_time_ms=request.response_time_ms,
            student_email=request.student_email,
            error_message=request.error_message,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metrics/health")
async def get_system_health(db: Session = Depends(get_db)):
    """Quick system health check — total students, sessions, docs, questions."""
    try:
        from backend.modules.evaluation.evaluation_repository import EvaluationRepository
        repo = EvaluationRepository(db)
        return repo.get_system_health()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))