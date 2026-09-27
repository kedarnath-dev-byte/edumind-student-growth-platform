"""Role-aware dependencies for student / teacher / parent APIs."""

from typing import Any

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from core.auth import get_current_supabase_user
from core.database import get_db
from modules.student_growth.auth_profile_service import AuthProfileService


def _role(profile: dict[str, Any]) -> str:
    app_user = profile.get("app_user")
    return (getattr(app_user, "role", None) or "").upper()


async def require_linked_user(
    payload: dict[str, Any] = Depends(get_current_supabase_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    return AuthProfileService(db).resolve_current_user(payload)


def require_roles(*allowed: str):
    allowed_set = {item.upper() for item in allowed}

    async def _inner(
        profile: dict[str, Any] = Depends(require_linked_user),
    ) -> dict[str, Any]:
        role = _role(profile)
        if role not in allowed_set:
            raise HTTPException(status_code=403, detail="Not allowed for this role")
        return profile

    return _inner


def student_id_from_profile(profile: dict[str, Any]) -> int:
    student = profile.get("student_profile")
    student_id = getattr(student, "id", None)
    if not student_id:
        raise HTTPException(status_code=403, detail="Student profile is not linked")
    return int(student_id)


def teacher_id_from_profile(profile: dict[str, Any]) -> int:
    teacher = profile.get("teacher_profile")
    teacher_id = getattr(teacher, "id", None)
    if not teacher_id:
        raise HTTPException(status_code=403, detail="Teacher profile is not linked")
    return int(teacher_id)


def parent_id_from_profile(profile: dict[str, Any]) -> int:
    parent = profile.get("parent_profile")
    parent_id = getattr(parent, "id", None)
    if not parent_id:
        raise HTTPException(status_code=403, detail="Parent profile is not linked")
    return int(parent_id)


def app_user_id_from_profile(profile: dict[str, Any]) -> int:
    app_user = profile.get("app_user")
    user_id = getattr(app_user, "id", None)
    if not user_id:
        raise HTTPException(status_code=403, detail="App user is not linked")
    return int(user_id)


def assert_can_view_student(profile: dict[str, Any], student_id: int) -> None:
    role = _role(profile)
    if role == "ADMIN":
        return
    if role == "STUDENT":
        if student_id_from_profile(profile) != int(student_id):
            raise HTTPException(status_code=403, detail="You can only view your own learning")
        return
    if role == "PARENT":
        children = profile.get("parent_children") or []
        child_ids = set()
        for item in children:
            raw = getattr(item, "id", None)
            if raw is None and isinstance(item, dict):
                raw = item.get("id")
            if raw:
                child_ids.add(int(raw))
        if int(student_id) not in child_ids:
            raise HTTPException(status_code=403, detail="This student is not linked to your parent account")
        return
    if role == "TEACHER":
        return
    raise HTTPException(status_code=403, detail="Not allowed")
