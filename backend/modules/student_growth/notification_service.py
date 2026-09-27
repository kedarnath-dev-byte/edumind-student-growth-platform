"""Memory-protecting notification dispatch with quiet hours."""

from datetime import datetime, time, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy.orm import Session

from modules.student_growth.models import (
    LearningLog, ParentProfile, ParentStudentLink, RevisionTask, StudentProfile, TeacherProfile,
)
from modules.student_growth.notification_models import InAppNotification, NotificationPreference

IST = ZoneInfo("Asia/Kolkata")


def _hhmm(value, fallback):
    try:
        h, m = str(value or "").split(":")
        return time(int(h), int(m))
    except Exception:
        return fallback


def in_quiet_hours(prefs, now_local=None):
    local = now_local or datetime.now(IST)
    start = _hhmm(getattr(prefs, "quiet_hours_start", None), time(20, 0))
    end = _hhmm(getattr(prefs, "quiet_hours_end", None), time(7, 0))
    current = time(local.hour, local.minute)
    if start <= end:
        return start <= current < end
    return current >= start or current < end


class NotificationService:
    def __init__(self, db: Session):
        self.db = db

    def get_or_create_preferences(self, app_user_id: int) -> NotificationPreference:
        prefs = self.db.query(NotificationPreference).filter(NotificationPreference.app_user_id == app_user_id).first()
        if prefs:
            return prefs
        prefs = NotificationPreference(app_user_id=app_user_id)
        self.db.add(prefs)
        self.db.commit()
        self.db.refresh(prefs)
        return prefs

    def update_preferences(self, app_user_id: int, updates: dict[str, Any]) -> NotificationPreference:
        prefs = self.get_or_create_preferences(app_user_id)
        allowed = {
            "push_enabled", "email_enabled", "in_app_enabled", "quiet_hours_start",
            "quiet_hours_end", "timezone", "revision_due_enabled", "memory_rescue_enabled",
            "parent_digest_enabled", "teacher_support_enabled",
        }
        for key, value in updates.items():
            if key in allowed and value is not None:
                setattr(prefs, key, value)
        prefs.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(prefs)
        return prefs

    def list_notifications(self, app_user_id: int, unread_only: bool = False):
        q = self.db.query(InAppNotification).filter(InAppNotification.app_user_id == app_user_id)
        if unread_only:
            q = q.filter(InAppNotification.is_read.is_(False))
        return q.order_by(InAppNotification.created_at.desc()).limit(50).all()

    def mark_read(self, app_user_id: int, notification_id: int):
        row = self.db.query(InAppNotification).filter(
            InAppNotification.id == notification_id, InAppNotification.app_user_id == app_user_id
        ).first()
        if row is None:
            raise HTTPException(status_code=404, detail="Notification not found")
        row.is_read = True
        row.read_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(row)
        return row

    def _create(self, **kwargs):
        prefs = kwargs.pop("prefs", None)
        allow_quiet = kwargs.pop("allow_during_quiet", False)
        if prefs and not prefs.in_app_enabled:
            return None
        if prefs and in_quiet_hours(prefs) and not allow_quiet:
            return None
        if self.db.query(InAppNotification.id).filter(InAppNotification.dedupe_key == kwargs["dedupe_key"]).first():
            return None
        row = InAppNotification(**kwargs)
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def _student_user_id(self, student_profile_id: int):
        student = self.db.query(StudentProfile).filter(StudentProfile.id == student_profile_id).first()
        return student.user_id if student else None

    def dispatch_revision_due(self, app_user_id=None) -> int:
        now = datetime.utcnow()
        today = now.date().isoformat()
        created = 0
        for task in self.db.query(RevisionTask).filter(RevisionTask.status == "PENDING").all():
            user_id = self._student_user_id(task.student_id)
            if not user_id or (app_user_id and user_id != app_user_id) or task.due_at is None:
                continue
            prefs = self.get_or_create_preferences(user_id)
            overdue = task.due_at < now
            due_today = hasattr(task.due_at, "date") and task.due_at.date() == now.date()
            if overdue and prefs.memory_rescue_enabled:
                row = self._create(
                    app_user_id=user_id, audience_role="STUDENT", category="MEMORY_RESCUE",
                    title="Memory rescue",
                    body="A revision waited past its date. Rescue it gently — this protects memory, not marks.",
                    link_path="/student-revisions", dedupe_key=f"rescue:{task.id}:{today}", prefs=prefs,
                )
            elif due_today and prefs.revision_due_enabled:
                row = self._create(
                    app_user_id=user_id, audience_role="STUDENT", category="REVISION_DUE",
                    title="Revision due today",
                    body="A short revision mission is ready. Two minutes now protects this topic.",
                    link_path="/student-revisions", dedupe_key=f"due:{task.id}:{today}", prefs=prefs,
                )
            else:
                row = None
            if row:
                created += 1
        return created

    def dispatch_parent_digest(self, app_user_id=None) -> int:
        today = datetime.utcnow().date()
        start = datetime.combine(today, time.min)
        created = 0
        for link in self.db.query(ParentStudentLink).filter(ParentStudentLink.status == "ACTIVE").all():
            parent = self.db.query(ParentProfile).filter(ParentProfile.id == link.parent_profile_id).first()
            if parent is None or (app_user_id and parent.user_id != app_user_id):
                continue
            prefs = self.get_or_create_preferences(parent.user_id)
            if not prefs.parent_digest_enabled:
                continue
            student = self.db.query(StudentProfile).filter(StudentProfile.id == link.student_profile_id).first()
            logs = self.db.query(LearningLog).filter(LearningLog.student_id == link.student_profile_id, LearningLog.created_at >= start).count()
            pending = self.db.query(RevisionTask).filter(RevisionTask.student_id == link.student_profile_id, RevisionTask.status == "PENDING").count()
            name = student.display_name if student else "Your child"
            row = self._create(
                app_user_id=parent.user_id, audience_role="PARENT", category="PARENT_DIGEST",
                title="Evening learning digest",
                body=f"{name}: {logs} learning log(s) today, {pending} revision(s) still open. No ranks — only growth signals.",
                link_path="/parent-dashboard",
                dedupe_key=f"parent:{parent.id}:{link.student_profile_id}:{today.isoformat()}",
                prefs=prefs, allow_during_quiet=True,
            )
            if row:
                created += 1
        return created

    def dispatch_teacher_support(self, app_user_id=None) -> int:
        today = datetime.utcnow().date()
        start = datetime.utcnow() - timedelta(hours=24)
        logs = self.db.query(LearningLog).filter(LearningLog.created_at >= start, LearningLog.not_understood.isnot(None)).all()
        total = sum(1 for log in logs if len((log.not_understood or "").strip()) >= 3)
        created = 0
        if total == 0:
            return 0
        for teacher in self.db.query(TeacherProfile).all():
            if app_user_id and teacher.user_id != app_user_id:
                continue
            prefs = self.get_or_create_preferences(teacher.user_id)
            if not prefs.teacher_support_enabled:
                continue
            row = self._create(
                app_user_id=teacher.user_id, audience_role="TEACHER", category="TEACHER_SUPPORT",
                title="Students asking for support",
                body=f"{total} honest-confusion note(s) in the last 24 hours. Open the teacher dashboard before it becomes exam pressure.",
                link_path="/teacher-dashboard",
                dedupe_key=f"teacher:{teacher.id}:{today.isoformat()}",
                prefs=prefs, allow_during_quiet=True,
            )
            if row:
                created += 1
        return created

    def dispatch_all(self, app_user_id=None):
        revision = self.dispatch_revision_due(app_user_id)
        parent = self.dispatch_parent_digest(app_user_id)
        teacher = self.dispatch_teacher_support(app_user_id)
        return {
            "revision_or_rescue": revision,
            "parent_digest": parent,
            "teacher_support": teacher,
            "total": revision + parent + teacher,
        }
