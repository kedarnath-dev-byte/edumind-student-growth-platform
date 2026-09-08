from core.access import authorize_growth
"""HTTP endpoints for student habit summaries."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.database import get_db
from modules.student_growth.habit_service import HabitService
from modules.student_growth.schemas import HabitSummaryResponse

router = APIRouter(dependencies=[Depends(authorize_growth)], prefix="/api/v1", tags=["Student Habits"])


@router.get(
    "/habits/student/{student_id}/summary",
    response_model=HabitSummaryResponse,
)
def get_student_habit_summary(
    student_id: int,
    db: Session = Depends(get_db),
):
    return HabitService(db).get_student_habit_summary(student_id)
