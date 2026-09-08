from core.access import authorize_growth
"""HTTP endpoints for teacher dashboard summaries."""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from core.database import get_db
from modules.student_growth.teacher_dashboard_schemas import (
    TeacherClassroomSummaryResponse,
)
from modules.student_growth.teacher_dashboard_service import TeacherDashboardService

router = APIRouter(dependencies=[Depends(authorize_growth)], prefix="/api/v1", tags=["Teacher Dashboard"])


@router.get(
    "/teacher-dashboard/classroom/{classroom_id}/summary",
    response_model=TeacherClassroomSummaryResponse,
)
def get_teacher_classroom_summary(
    classroom_id: int,
    school_id: Optional[int] = Query(default=None),
    subject_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
):
    return TeacherDashboardService(db).get_classroom_summary(
        classroom_id=classroom_id,
        school_id=school_id,
        subject_id=subject_id,
    )
