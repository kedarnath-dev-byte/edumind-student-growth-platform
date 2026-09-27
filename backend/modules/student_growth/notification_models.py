"""Notification tables. Imported so init_db creates them."""

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text

from core.database import Base


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    id = Column(Integer, primary_key=True, index=True)
    app_user_id = Column(Integer, unique=True, index=True, nullable=False)
    push_enabled = Column(Boolean, default=True)
    email_enabled = Column(Boolean, default=True)
    in_app_enabled = Column(Boolean, default=True)
    quiet_hours_start = Column(String, default="20:00")
    quiet_hours_end = Column(String, default="07:00")
    timezone = Column(String, default="Asia/Kolkata")
    revision_due_enabled = Column(Boolean, default=True)
    memory_rescue_enabled = Column(Boolean, default=True)
    parent_digest_enabled = Column(Boolean, default=True)
    teacher_support_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True)


class InAppNotification(Base):
    __tablename__ = "in_app_notifications"

    id = Column(Integer, primary_key=True, index=True)
    app_user_id = Column(Integer, index=True, nullable=True)
    audience_role = Column(String, index=True, nullable=True)
    category = Column(String, index=True, nullable=False)
    title = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    link_path = Column(String, nullable=True)
    is_read = Column(Boolean, default=False)
    dedupe_key = Column(String, index=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    read_at = Column(DateTime, nullable=True)
