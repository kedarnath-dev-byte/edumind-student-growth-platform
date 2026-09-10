"""HTTP API for Instagram-style subject worlds."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from core.auth import get_current_supabase_user, require_admin_user
from core.database import get_db
from modules.student_growth.subject_social_schemas import (
    SubjectFollowCreate,
    SubjectPostCreate,
)
from modules.student_growth.subject_social_service import SubjectSocialService

router = APIRouter(prefix="/api/v1/subject-social", tags=["Subject Social"])


@router.get("/subjects")
async def list_my_subjects(
    db: Session = Depends(get_db),
    payload: dict = Depends(get_current_supabase_user),
):
    subjects = SubjectSocialService(db).list_my_subjects(payload)
    return [{"id": s.id, "name": s.name, "school_id": s.school_id} for s in subjects]


@router.get("/feed")
async def subject_feed(
    subject_id: int = Query(...),
    limit: int = Query(40, ge=1, le=100),
    db: Session = Depends(get_db),
    payload: dict = Depends(get_current_supabase_user),
):
    return SubjectSocialService(db).feed(payload, subject_id=subject_id, limit=limit)


@router.post("/posts")
async def create_subject_post(
    body: SubjectPostCreate,
    db: Session = Depends(get_db),
    payload: dict = Depends(get_current_supabase_user),
):
    return SubjectSocialService(db).create_post(payload, body)


@router.delete("/posts/{post_id}")
async def remove_subject_post(
    post_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(get_current_supabase_user),
):
    return SubjectSocialService(db).remove_post(payload, post_id)


@router.get("/profiles/{student_id}")
async def subject_profile(
    student_id: int,
    subject_id: int = Query(...),
    db: Session = Depends(get_db),
    payload: dict = Depends(get_current_supabase_user),
):
    return SubjectSocialService(db).profile(payload, student_id, subject_id)


@router.post("/follows")
async def follow_student(
    body: SubjectFollowCreate,
    db: Session = Depends(get_db),
    payload: dict = Depends(get_current_supabase_user),
):
    return SubjectSocialService(db).follow(
        payload, body.following_student_id, body.subject_id
    )


@router.delete("/follows")
async def unfollow_student(
    following_student_id: int = Query(...),
    subject_id: int = Query(...),
    db: Session = Depends(get_db),
    payload: dict = Depends(get_current_supabase_user),
):
    return SubjectSocialService(db).unfollow(payload, following_student_id, subject_id)


@router.get("/admin/posts")
async def admin_list_subject_posts(
    subject_id: int | None = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _admin: dict = Depends(require_admin_user),
):
    return SubjectSocialService(db).admin_list_posts(subject_id=subject_id, limit=limit)


@router.delete("/admin/posts/{post_id}")
async def admin_remove_subject_post(
    post_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_admin_user),
):
    return SubjectSocialService(db).remove_post(payload, post_id, as_admin=True)
