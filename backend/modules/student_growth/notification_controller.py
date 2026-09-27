"""In-app notification inbox, preferences, and dispatch job."""

from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from core.database import get_db
from core.growth_auth import app_user_id_from_profile, require_linked_user, require_roles
from modules.student_growth.notification_service import NotificationService, in_quiet_hours

router = APIRouter(prefix="/api/v1/growth", tags=["Notifications"])


class PreferenceUpdate(BaseModel):
    push_enabled: Optional[bool] = None
    email_enabled: Optional[bool] = None
    in_app_enabled: Optional[bool] = None
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None
    timezone: Optional[str] = None
    revision_due_enabled: Optional[bool] = None
    memory_rescue_enabled: Optional[bool] = None
    parent_digest_enabled: Optional[bool] = None
    teacher_support_enabled: Optional[bool] = None


class PreferenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    app_user_id: int
    push_enabled: bool
    email_enabled: bool
    in_app_enabled: bool
    quiet_hours_start: str
    quiet_hours_end: str
    timezone: str
    revision_due_enabled: bool
    memory_rescue_enabled: bool
    parent_digest_enabled: bool
    teacher_support_enabled: bool


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    category: str
    title: str
    body: str
    link_path: Optional[str] = None
    is_read: bool
    created_at: object


@router.get("/notifications", response_model=list[NotificationResponse])
async def list_notifications(unread_only: bool = False, profile: dict = Depends(require_linked_user), db: Session = Depends(get_db)):
    return NotificationService(db).list_notifications(app_user_id_from_profile(profile), unread_only=unread_only)


@router.post("/notifications/{notification_id}/read", response_model=NotificationResponse)
async def mark_read(notification_id: int, profile: dict = Depends(require_linked_user), db: Session = Depends(get_db)):
    return NotificationService(db).mark_read(app_user_id_from_profile(profile), notification_id)


@router.get("/notification-preferences", response_model=PreferenceResponse)
async def get_preferences(profile: dict = Depends(require_linked_user), db: Session = Depends(get_db)):
    return NotificationService(db).get_or_create_preferences(app_user_id_from_profile(profile))


@router.patch("/notification-preferences", response_model=PreferenceResponse)
async def update_preferences(payload: PreferenceUpdate, profile: dict = Depends(require_linked_user), db: Session = Depends(get_db)):
    return NotificationService(db).update_preferences(app_user_id_from_profile(profile), payload.model_dump(exclude_unset=True))


@router.post("/notifications/me/refresh")
async def refresh_my_notifications(profile: dict = Depends(require_linked_user), db: Session = Depends(get_db)):
    user_id = app_user_id_from_profile(profile)
    service = NotificationService(db)
    prefs = service.get_or_create_preferences(user_id)
    summary = service.dispatch_all(user_id)
    summary["quiet_hours_now"] = in_quiet_hours(prefs)
    return summary


@router.post("/notifications/dispatch")
async def dispatch_all_notifications(profile: dict = Depends(require_roles("ADMIN", "TEACHER")), db: Session = Depends(get_db)):
    return NotificationService(db).dispatch_all()
