"""Bridge Supabase Auth users to EduMind application profiles."""

from datetime import datetime
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from modules.student_growth.models import (
    AppUser,
    ParentProfile,
    StudentProfile,
    TeacherProfile,
)
from modules.student_growth.user_service import UserService


class AuthProfileService:
    """Resolves verified Supabase JWT payloads to EduMind user/profile records."""

    def __init__(self, db: Session):
        self.db = db

    def resolve_current_user(self, token_payload: dict[str, Any]) -> dict[str, Any]:
        supabase_user_id = token_payload.get("sub")
        email = token_payload.get("email")

        if not supabase_user_id:
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired authorization token",
            )

        app_user = self._find_or_link_app_user(supabase_user_id, email)
        if app_user is None:
            raise HTTPException(
                status_code=404,
                detail=(
                    "EduMind user profile is not linked yet. "
                    "Please contact EduMind admin."
                ),
            )

        response = {
            "authenticated": True,
            "supabase_user_id": supabase_user_id,
            "email": email,
            "app_user": app_user,
            "student_profile": None,
            "teacher_profile": None,
            "parent_profile": None,
            "parent_children": [],
            "teacher_classrooms": [],
        }

        role = (app_user.role or "").upper()
        user_service = UserService(self.db)

        if role == "STUDENT":
            response["student_profile"] = self._get_student_profile(app_user.id)
        elif role == "TEACHER":
            teacher_profile = self._get_teacher_profile(app_user.id)
            response["teacher_profile"] = teacher_profile
            if teacher_profile is not None:
                response["teacher_classrooms"] = user_service.list_teacher_classrooms(
                    teacher_profile.id
                )
        elif role == "PARENT":
            parent_profile = self._get_parent_profile(app_user.id)
            response["parent_profile"] = parent_profile
            if parent_profile is not None:
                response["parent_children"] = user_service.list_parent_children(
                    parent_profile.id
                )

        return response

    def link_current_user(
        self,
        token_payload: dict[str, Any],
        app_user_id: int,
    ) -> AppUser:
        supabase_user_id = token_payload.get("sub")
        email = token_payload.get("email")

        if not supabase_user_id:
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired authorization token",
            )

        app_user = self.db.query(AppUser).filter(AppUser.id == app_user_id).first()
        if app_user is None:
            raise HTTPException(status_code=404, detail="EduMind AppUser not found")

        app_user.supabase_user_id = supabase_user_id
        if not app_user.email and email:
            app_user.email = email
        app_user.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(app_user)
        return app_user

    def _find_or_link_app_user(
        self,
        supabase_user_id: str,
        email: str | None,
    ) -> AppUser | None:
        app_user = (
            self.db.query(AppUser)
            .filter(AppUser.supabase_user_id == supabase_user_id)
            .first()
        )
        if app_user is not None:
            return app_user

        if not email:
            return None

        app_user = (
            self.db.query(AppUser)
            .filter(AppUser.email == email, AppUser.supabase_user_id.is_(None))
            .first()
        )
        if app_user is None:
            return None

        app_user.supabase_user_id = supabase_user_id
        app_user.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(app_user)
        return app_user

    def _get_student_profile(self, app_user_id: int) -> StudentProfile | None:
        return (
            self.db.query(StudentProfile)
            .filter(StudentProfile.user_id == app_user_id)
            .first()
        )

    def _get_teacher_profile(self, app_user_id: int) -> TeacherProfile | None:
        return (
            self.db.query(TeacherProfile)
            .filter(TeacherProfile.user_id == app_user_id)
            .first()
        )

    def _get_parent_profile(self, app_user_id: int) -> ParentProfile | None:
        return (
            self.db.query(ParentProfile)
            .filter(ParentProfile.user_id == app_user_id)
            .first()
        )
