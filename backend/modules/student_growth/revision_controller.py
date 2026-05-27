"""HTTP endpoints for revisions and reward events."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.database import get_db
from modules.student_growth.revision_service import (
    FutureRevisionLockedError,
    RevisionService,
)
from modules.student_growth.schemas import (
    RevisionCompleteRequest,
    RevisionAttemptResponse,
    RevisionTaskResponse,
    RewardEventResponse,
)

router = APIRouter(prefix="/api/v1", tags=["Student Revisions & Rewards"])


@router.get("/revisions/student/{student_id}", response_model=list[RevisionTaskResponse])
async def get_revisions_for_student(student_id: int, db: Session = Depends(get_db)):
    return RevisionService(db).list_revisions_for_student(student_id)


@router.patch("/revisions/{revision_task_id}/complete", response_model=RevisionTaskResponse)
async def complete_revision(
    revision_task_id: int,
    payload: RevisionCompleteRequest,
    db: Session = Depends(get_db),
):
    try:
        result = RevisionService(db).complete_revision(
            revision_task_id=revision_task_id,
            difficulty_after_revision=payload.difficulty_after_revision,
            revision_text_summary=payload.revision_text_summary,
            revision_video_url=payload.revision_video_url,
        )
        return result["revision_task"]
    except FutureRevisionLockedError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/rewards/student/{student_id}", response_model=list[RewardEventResponse])
async def get_rewards_for_student(student_id: int, db: Session = Depends(get_db)):
    return RevisionService(db).list_rewards_for_student(student_id)


@router.get(
    "/revisions/{revision_task_id}/attempts",
    response_model=list[RevisionAttemptResponse],
)
async def get_attempts_for_revision(
    revision_task_id: int,
    db: Session = Depends(get_db),
):
    return RevisionService(db).list_attempts_for_revision(revision_task_id)


@router.get(
    "/revisions/student/{student_id}/attempts",
    response_model=list[RevisionAttemptResponse],
)
async def get_attempts_for_student(student_id: int, db: Session = Depends(get_db)):
    return RevisionService(db).list_attempts_for_student(student_id)
