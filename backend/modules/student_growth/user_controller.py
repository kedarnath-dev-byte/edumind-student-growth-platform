"""HTTP endpoints for pilot users, profiles, and role links."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from core.database import get_db
from modules.student_growth.setup_schemas import ClassroomResponse
from modules.student_growth.user_schemas import (
    AppUserCreate,
    AppUserResponse,
    ClassroomStudentCreate,
    ClassroomStudentResponse,
    ParentProfileCreate,
    ParentProfileResponse,
    ParentStudentLinkCreate,
    ParentStudentLinkResponse,
    StudentProfileCreate,
    StudentProfileResponse,
    TeacherClassroomCreate,
    TeacherClassroomResponse,
    TeacherProfileCreate,
    TeacherProfileResponse,
)
from modules.student_growth.user_service import (
    DuplicateProfileError,
    DuplicateUserError,
    UserConstraintError,
    UserNotFoundError,
    UserService,
)

router = APIRouter(prefix="/api/v1/users", tags=["Pilot Users & Profiles"])


@router.post("", response_model=AppUserResponse)
async def create_user(payload: AppUserCreate, db: Session = Depends(get_db)):
    try:
        return UserService(db).create_user(payload)
    except DuplicateUserError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except UserConstraintError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=list[AppUserResponse])
async def list_users(
    role: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    return UserService(db).list_users(role=role)


@router.post("/student-profiles", response_model=StudentProfileResponse)
async def create_student_profile(
    payload: StudentProfileCreate,
    db: Session = Depends(get_db),
):
    try:
        return UserService(db).create_student_profile(payload)
    except DuplicateProfileError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.get(
    "/student-profiles/{student_profile_id}",
    response_model=StudentProfileResponse,
)
async def get_student_profile(
    student_profile_id: int,
    db: Session = Depends(get_db),
):
    try:
        return UserService(db).get_student_profile(student_profile_id)
    except UserNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/teacher-profiles", response_model=TeacherProfileResponse)
async def create_teacher_profile(
    payload: TeacherProfileCreate,
    db: Session = Depends(get_db),
):
    try:
        return UserService(db).create_teacher_profile(payload)
    except DuplicateProfileError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.post("/parent-profiles", response_model=ParentProfileResponse)
async def create_parent_profile(
    payload: ParentProfileCreate,
    db: Session = Depends(get_db),
):
    try:
        return UserService(db).create_parent_profile(payload)
    except DuplicateProfileError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.post(
    "/parent-student-links",
    response_model=ParentStudentLinkResponse,
)
async def create_parent_student_link(
    payload: ParentStudentLinkCreate,
    db: Session = Depends(get_db),
):
    return UserService(db).create_parent_student_link(payload)


@router.post("/classroom-students", response_model=ClassroomStudentResponse)
async def create_classroom_student(
    payload: ClassroomStudentCreate,
    db: Session = Depends(get_db),
):
    return UserService(db).create_classroom_student(payload)


@router.post("/teacher-classrooms", response_model=TeacherClassroomResponse)
async def create_teacher_classroom(
    payload: TeacherClassroomCreate,
    db: Session = Depends(get_db),
):
    return UserService(db).create_teacher_classroom(payload)


@router.get(
    "/parent-profiles/{parent_profile_id}/children",
    response_model=list[StudentProfileResponse],
)
async def list_parent_children(
    parent_profile_id: int,
    db: Session = Depends(get_db),
):
    return UserService(db).list_parent_children(parent_profile_id)


@router.get(
    "/teacher-profiles/{teacher_profile_id}/classrooms",
    response_model=list[ClassroomResponse],
)
async def list_teacher_classrooms(
    teacher_profile_id: int,
    db: Session = Depends(get_db),
):
    return UserService(db).list_teacher_classrooms(teacher_profile_id)
