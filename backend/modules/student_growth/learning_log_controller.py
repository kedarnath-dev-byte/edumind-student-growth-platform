"""HTTP endpoints for student learning logs."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.database import get_db
from modules.student_growth.learning_log_service import LearningLogService
from modules.student_growth.schemas import LearningLogCreate, LearningLogResponse

router = APIRouter(prefix="/api/v1/learning-logs", tags=["Student Learning Logs"])


@router.post("", response_model=LearningLogResponse)
async def create_learning_log(payload: LearningLogCreate, db: Session = Depends(get_db)):
    try:
        result = LearningLogService(db).create_learning_log(payload)
        learning_log = result["learning_log"]
        return LearningLogResponse.model_validate(
            {
                **learning_log.__dict__,
                "revision_tasks": result["revision_tasks"],
                "rewards": result["rewards"],
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/student/{student_id}", response_model=list[LearningLogResponse])
async def get_learning_logs_for_student(student_id: int, db: Session = Depends(get_db)):
    logs = LearningLogService(db).get_learning_logs_for_student(student_id)
    return [
        LearningLogResponse.model_validate(
            {**log.__dict__, "revision_tasks": [], "rewards": []}
        )
        for log in logs
    ]
