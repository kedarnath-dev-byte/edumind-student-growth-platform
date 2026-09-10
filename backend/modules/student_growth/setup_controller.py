"""HTTP endpoints for school setup dropdown data."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.auth import get_current_supabase_user, require_admin_user
from core.database import get_db
from modules.student_growth.setup_schemas import (
    ClassroomCreate,
    ClassroomResponse,
    SchoolCreate,
    SchoolResponse,
    SubjectCreate,
    SubjectResponse,
    TopicCreate,
    TopicResponse,
)
from modules.student_growth.setup_service import SetupService

router = APIRouter(prefix="/api/v1", tags=["School Setup"])


@router.post("/schools", response_model=SchoolResponse)
async def create_school(
    payload: SchoolCreate,
    db: Session = Depends(get_db),
    _admin: dict = Depends(require_admin_user),
):
    return SetupService(db).create_school(payload)


@router.get("/schools", response_model=list[SchoolResponse])
async def list_schools(
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_supabase_user),
):
    """Requires JWT — school names/cities must not be public."""
    return SetupService(db).list_schools()


@router.delete("/schools/{school_id}")
async def delete_school(
    school_id: int,
    db: Session = Depends(get_db),
    _admin: dict = Depends(require_admin_user),
):
    try:
        return SetupService(db).delete_school(school_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/classrooms", response_model=ClassroomResponse)
async def create_classroom(
    payload: ClassroomCreate,
    db: Session = Depends(get_db),
    _admin: dict = Depends(require_admin_user),
):
    return SetupService(db).create_classroom(payload)


@router.get("/classrooms", response_model=list[ClassroomResponse])
async def list_classrooms(
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_supabase_user),
):
    return SetupService(db).list_classrooms()


@router.get("/classrooms/school/{school_id}", response_model=list[ClassroomResponse])
async def list_classrooms_by_school(
    school_id: int,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_supabase_user),
):
    return SetupService(db).list_classrooms_by_school(school_id)


@router.post("/subjects", response_model=SubjectResponse)
async def create_subject(
    payload: SubjectCreate,
    db: Session = Depends(get_db),
    _admin: dict = Depends(require_admin_user),
):
    return SetupService(db).create_subject(payload)


@router.get("/subjects", response_model=list[SubjectResponse])
async def list_subjects(
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_supabase_user),
):
    return SetupService(db).list_subjects()


@router.get("/subjects/school/{school_id}", response_model=list[SubjectResponse])
async def list_subjects_by_school(
    school_id: int,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_supabase_user),
):
    return SetupService(db).list_subjects_by_school(school_id)


@router.post("/topics", response_model=TopicResponse)
async def create_topic(
    payload: TopicCreate,
    db: Session = Depends(get_db),
    _admin: dict = Depends(require_admin_user),
):
    return SetupService(db).create_topic(payload)


@router.get("/topics", response_model=list[TopicResponse])
async def list_topics(
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_supabase_user),
):
    return SetupService(db).list_topics()


@router.get("/topics/subject/{subject_id}", response_model=list[TopicResponse])
async def list_topics_by_subject(
    subject_id: int,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_supabase_user),
):
    return SetupService(db).list_topics_by_subject(subject_id)
