"""HTTP endpoints for parent dashboard summaries."""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from core.auth import assert_can_access_student, get_resolved_edumind_profile
from core.database import get_db
from modules.student_growth.parent_dashboard_schemas import (
    ParentStudentSummaryResponse,
)
from modules.student_growth.parent_dashboard_service import ParentDashboardService

router = APIRouter(prefix="/api/v1", tags=["Parent Dashboard"])


@router.get(
    "/parent-dashboard/student/{student_id}/summary",
    response_model=ParentStudentSummaryResponse,
)
async def get_parent_student_summary(
    student_id: int,
    school_id: Optional[int] = Query(default=None),
    classroom_id: Optional[int] = Query(default=None),
    subject_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    profile: dict = Depends(get_resolved_edumind_profile),
):
    assert_can_access_student(profile, student_id)
    return ParentDashboardService(db).get_student_summary(
        student_id=student_id,
        school_id=school_id,
        classroom_id=classroom_id,
        subject_id=subject_id,
    )
