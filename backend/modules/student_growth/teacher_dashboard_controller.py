"""HTTP endpoints for teacher dashboard summaries."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from core.auth import get_resolved_edumind_profile
from core.database import get_db
from modules.student_growth.teacher_dashboard_schemas import (
    TeacherClassroomSummaryResponse,
)
from modules.student_growth.teacher_dashboard_service import TeacherDashboardService

router = APIRouter(prefix="/api/v1", tags=["Teacher Dashboard"])


@router.get(
    "/teacher-dashboard/classroom/{classroom_id}/summary",
    response_model=TeacherClassroomSummaryResponse,
)
async def get_teacher_classroom_summary(
    classroom_id: int,
    school_id: Optional[int] = Query(default=None),
    subject_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    profile: dict = Depends(get_resolved_edumind_profile),
):
    app_user = profile.get("app_user")
    role = (getattr(app_user, "role", None) or "").upper()
    if role not in {"TEACHER", "ADMIN"}:
        raise HTTPException(status_code=403, detail="Teacher or admin access required")
    return TeacherDashboardService(db).get_classroom_summary(
        classroom_id=classroom_id,
        school_id=school_id,
        subject_id=subject_id,
    )
