"""HTTP endpoints for student learning logs."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.database import get_db
from modules.student_growth.learning_log_service import LearningLogService
from modules.student_growth.schemas import (
    LearningLogCreate,
    LearningLogResponse,
    RevisionTaskResponse,
    RewardEventResponse,
)

router = APIRouter(prefix="/api/v1/learning-logs", tags=["Student Learning Logs"])


def serialize_learning_log(learning_log, revision_tasks=None, rewards=None) -> LearningLogResponse:
    """Build a clean response model without leaking SQLAlchemy internals."""
    return LearningLogResponse(
        id=learning_log.id,
        student_id=learning_log.student_id,
        school_id=learning_log.school_id,
        classroom_id=learning_log.classroom_id,
        subject_id=learning_log.subject_id,
        topic_id=learning_log.topic_id,
        taught_today=learning_log.taught_today,
        understood=learning_log.understood,
        not_understood=learning_log.not_understood,
        confidence_level=learning_log.confidence_level,
        created_at=learning_log.created_at,
        revision_tasks=[
            RevisionTaskResponse.model_validate(task)
            for task in (revision_tasks or [])
        ],
        rewards=[
            RewardEventResponse.model_validate(reward)
            for reward in (rewards or [])
        ],
    )


@router.post("", response_model=LearningLogResponse)
async def create_learning_log(payload: LearningLogCreate, db: Session = Depends(get_db)):
    try:
        result = LearningLogService(db).create_learning_log(payload)
        return serialize_learning_log(
            result["learning_log"],
            revision_tasks=result["revision_tasks"],
            rewards=result["rewards"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/student/{student_id}", response_model=list[LearningLogResponse])
async def get_learning_logs_for_student(student_id: int, db: Session = Depends(get_db)):
    logs = LearningLogService(db).get_learning_logs_for_student(student_id)
    return [serialize_learning_log(log) for log in logs]
