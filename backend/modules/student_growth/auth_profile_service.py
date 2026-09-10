"""Bridge Supabase Auth users to EduMind application profiles."""

from datetime import datetime
from typing import Any

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from modules.student_growth.models import (
    AppUser,
    ParentProfile,
    StudentProfile,
    TeacherProfile,
)
from modules.student_growth.user_service import UserService


def extract_token_phone(token_payload: dict[str, Any]) -> str | None:
    """Best-effort phone from a Supabase JWT (phone auth or metadata)."""
    phone = token_payload.get("phone")
    if phone:
        normalized = str(phone).strip()
        return normalized or None

    user_metadata = token_payload.get("user_metadata") or {}
    if isinstance(user_metadata, dict):
        meta_phone = user_metadata.get("phone")
        if meta_phone:
            normalized = str(meta_phone).strip()
            return normalized or None

    return None


class AuthProfileService:
    """Resolves verified Supabase JWT payloads to EduMind user/profile records."""

    def __init__(self, db: Session):
        self.db = db

    def resolve_current_user(self, token_payload: dict[str, Any]) -> dict[str, Any]:
        supabase_user_id = token_payload.get("sub")
        email = token_payload.get("email")
        phone = extract_token_phone(token_payload)

        if not supabase_user_id:
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired authorization token",
            )

        app_user = self._find_or_link_app_user(supabase_user_id, email, phone)
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

    def bootstrap_student(
        self,
        token_payload: dict[str, Any],
        full_name: str,
        phone: str | None = None,
    ) -> dict[str, Any]:
        """Create STUDENT AppUser + StudentProfile for the JWT subject (idempotent)."""
        supabase_user_id = token_payload.get("sub")
        email = token_payload.get("email")
        token_phone = extract_token_phone(token_payload)
        resolved_phone = (phone or token_phone or None)
        if resolved_phone:
            resolved_phone = str(resolved_phone).strip() or None

        if not supabase_user_id:
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired authorization token",
            )

        existing = (
            self.db.query(AppUser)
            .filter(AppUser.supabase_user_id == supabase_user_id)
            .first()
        )
        if existing is not None:
            return self.resolve_current_user(token_payload)

        # Prefer linking a pre-seeded AppUser by email/phone before creating.
        linked = self._find_or_link_app_user(supabase_user_id, email, resolved_phone)
        if linked is not None:
            if not self._get_student_profile(linked.id) and (
                (linked.role or "").upper() == "STUDENT"
            ):
                self._ensure_student_profile(linked.id, full_name)
            return self.resolve_current_user(token_payload)

        if email:
            conflict = (
                self.db.query(AppUser)
                .filter(AppUser.email == email)
                .first()
            )
            if conflict is not None:
                raise HTTPException(
                    status_code=409,
                    detail="An EduMind account with this email already exists.",
                )

        if resolved_phone:
            conflict = (
                self.db.query(AppUser)
                .filter(AppUser.phone == resolved_phone)
                .first()
            )
            if conflict is not None:
                raise HTTPException(
                    status_code=409,
                    detail="An EduMind account with this phone already exists.",
                )

        try:
            app_user = AppUser(
                supabase_user_id=supabase_user_id,
                full_name=full_name.strip(),
                email=email,
                phone=resolved_phone,
                role="STUDENT",
                status="ACTIVE",
            )
            self.db.add(app_user)
            self.db.flush()
            self._ensure_student_profile(app_user.id, full_name.strip())
            self.db.commit()
            self.db.refresh(app_user)
        except IntegrityError as exc:
            self.db.rollback()
            message = str(exc.orig).lower()
            if "email" in message:
                raise HTTPException(
                    status_code=409,
                    detail="An EduMind account with this email already exists.",
                ) from exc
            if "phone" in message:
                raise HTTPException(
                    status_code=409,
                    detail="An EduMind account with this phone already exists.",
                ) from exc
            raise HTTPException(
                status_code=400,
                detail="Student profile could not be created.",
            ) from exc

        return self.resolve_current_user(token_payload)


    def bootstrap_admin(
        self,
        token_payload: dict[str, Any],
        full_name: str,
        phone: str | None = None,
    ) -> dict[str, Any]:
        """Create ADMIN AppUser for the JWT subject (no student profile).

        Pilot safety:
        - If AppUser already linked to this JWT: return profile when ADMIN,
          else 409 with the existing role.
        - Prefer linking an unlinked AppUser by email/phone when role is ADMIN.
        - Create a new ADMIN only when zero ADMIN users exist yet.
        """
        supabase_user_id = token_payload.get("sub")
        email = token_payload.get("email")
        token_phone = extract_token_phone(token_payload)
        resolved_phone = (phone or token_phone or None)
        if resolved_phone:
            resolved_phone = str(resolved_phone).strip() or None

        if not supabase_user_id:
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired authorization token",
            )

        existing = (
            self.db.query(AppUser)
            .filter(AppUser.supabase_user_id == supabase_user_id)
            .first()
        )
        if existing is not None:
            role = (existing.role or "").upper()
            if role == "ADMIN":
                return self.resolve_current_user(token_payload)
            raise HTTPException(
                status_code=409,
                detail=f"Account already linked as {role}",
            )

        # Prefer linking a pre-seeded unlinked ADMIN by email/phone.
        linked = self._find_or_link_app_user(supabase_user_id, email, resolved_phone)
        if linked is not None:
            role = (linked.role or "").upper()
            if role == "ADMIN":
                return self.resolve_current_user(token_payload)
            raise HTTPException(
                status_code=409,
                detail=f"Account already linked as {role}",
            )

        admin_count = (
            self.db.query(AppUser)
            .filter(AppUser.role == "ADMIN")
            .count()
        )
        if admin_count > 0:
            raise HTTPException(
                status_code=403,
                detail=(
                    "Admin bootstrap is closed. An ADMIN already exists. "
                    "Ask an existing admin to create an ADMIN AppUser and link it."
                ),
            )

        if email:
            conflict = (
                self.db.query(AppUser)
                .filter(AppUser.email == email)
                .first()
            )
            if conflict is not None:
                raise HTTPException(
                    status_code=409,
                    detail="An EduMind account with this email already exists.",
                )

        if resolved_phone:
            conflict = (
                self.db.query(AppUser)
                .filter(AppUser.phone == resolved_phone)
                .first()
            )
            if conflict is not None:
                raise HTTPException(
                    status_code=409,
                    detail="An EduMind account with this phone already exists.",
                )

        try:
            app_user = AppUser(
                supabase_user_id=supabase_user_id,
                full_name=full_name.strip(),
                email=email,
                phone=resolved_phone,
                role="ADMIN",
                status="ACTIVE",
            )
            self.db.add(app_user)
            self.db.commit()
            self.db.refresh(app_user)
        except IntegrityError as exc:
            self.db.rollback()
            message = str(exc.orig).lower()
            if "email" in message:
                raise HTTPException(
                    status_code=409,
                    detail="An EduMind account with this email already exists.",
                ) from exc
            if "phone" in message:
                raise HTTPException(
                    status_code=409,
                    detail="An EduMind account with this phone already exists.",
                ) from exc
            raise HTTPException(
                status_code=400,
                detail="Admin profile could not be created.",
            ) from exc

        return self.resolve_current_user(token_payload)

    def link_current_user(
        self,
        token_payload: dict[str, Any],
        app_user_id: int,
    ) -> AppUser:
        supabase_user_id = token_payload.get("sub")
        email = token_payload.get("email")
        phone = extract_token_phone(token_payload)

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
        if not app_user.phone and phone:
            app_user.phone = phone
        app_user.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(app_user)
        return app_user

    def _find_or_link_app_user(
        self,
        supabase_user_id: str,
        email: str | None,
        phone: str | None = None,
    ) -> AppUser | None:
        app_user = (
            self.db.query(AppUser)
            .filter(AppUser.supabase_user_id == supabase_user_id)
            .first()
        )
        if app_user is not None:
            return app_user

        if email:
            app_user = (
                self.db.query(AppUser)
                .filter(AppUser.email == email, AppUser.supabase_user_id.is_(None))
                .first()
            )
            if app_user is not None:
                app_user.supabase_user_id = supabase_user_id
                if phone and not app_user.phone:
                    app_user.phone = phone
                app_user.updated_at = datetime.utcnow()
                self.db.commit()
                self.db.refresh(app_user)
                return app_user

        # When email is missing (typical phone OTP), link by phone.
        if phone:
            app_user = (
                self.db.query(AppUser)
                .filter(AppUser.phone == phone, AppUser.supabase_user_id.is_(None))
                .first()
            )
            if app_user is not None:
                app_user.supabase_user_id = supabase_user_id
                if email and not app_user.email:
                    app_user.email = email
                app_user.updated_at = datetime.utcnow()
                self.db.commit()
                self.db.refresh(app_user)
                return app_user

        return None

    def _ensure_student_profile(self, app_user_id: int, display_name: str) -> StudentProfile:
        existing = self._get_student_profile(app_user_id)
        if existing is not None:
            return existing
        profile = StudentProfile(
            user_id=app_user_id,
            display_name=display_name,
        )
        self.db.add(profile)
        self.db.flush()
        return profile

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
