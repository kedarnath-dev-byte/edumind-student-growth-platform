"""HTTP endpoints for Courage Loop under /api/v1/courage-loops."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from core.auth import require_admin_user
from core.database import get_db
from modules.student_growth.courage_loop_schemas import (
    CourageLoopAdvanceRequest,
    CourageLoopCreate,
    CourageLoopPulseSummary,
    CourageLoopResponse,
)
from modules.student_growth.courage_loop_service import (
    CourageLoopNotFoundError,
    CourageLoopRuleError,
    CourageLoopService,
)

router = APIRouter(prefix="/api/v1/courage-loops", tags=["Courage Loop"])


@router.post("", response_model=CourageLoopResponse)
async def create_courage_loop(
    payload: CourageLoopCreate,
    db: Session = Depends(get_db),
):
    try:
        return CourageLoopService(db).create(payload)
    except CourageLoopRuleError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/mine", response_model=list[CourageLoopResponse])
async def list_my_courage_loops(
    student_id: int = Query(...),
    db: Session = Depends(get_db),
):
    return CourageLoopService(db).list_mine(student_id)


@router.patch("/{loop_id}/advance", response_model=CourageLoopResponse)
async def advance_courage_loop(
    loop_id: int,
    payload: CourageLoopAdvanceRequest,
    student_id: int = Query(...),
    db: Session = Depends(get_db),
):
    try:
        return CourageLoopService(db).advance(loop_id, student_id, payload)
    except CourageLoopRuleError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except CourageLoopNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/admin/pulse-summary", response_model=CourageLoopPulseSummary)
async def courage_pulse_summary(
    school_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    _admin: dict = Depends(require_admin_user),
):
    """Admin Pulse: counts + fear tags only. Never returns private note text."""
    return CourageLoopService(db).admin_pulse_summary(school_id=school_id)
