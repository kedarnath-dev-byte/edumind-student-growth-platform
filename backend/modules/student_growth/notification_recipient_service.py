"""Resolve WhatsApp recipient phone for a student (E.164)."""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Optional

from sqlalchemy.orm import Session

from modules.student_growth.models import (
    AppUser,
    ParentProfile,
    ParentStudentLink,
    StudentProfile,
)

logger = logging.getLogger(__name__)


@dataclass
class NotificationRecipient:
    phone_e164: str
    source: str  # app_user.phone | guardian_contact | parent.phone
    student_profile_id: int
    student_display_name: str


class NotificationRecipientService:
    """
    Recipient priority (locked product decision):
    1. student AppUser.phone
    2. student_profiles.guardian_contact
    3. linked parent ParentProfile.phone (ACTIVE link)
    Skip + log if none.
    """

    DEFAULT_COUNTRY_CODE = "91"

    def __init__(self, db: Session):
        self.db = db

    def resolve_for_student(self, student_profile_id: int) -> Optional[NotificationRecipient]:
        profile = (
            self.db.query(StudentProfile)
            .filter(StudentProfile.id == student_profile_id)
            .first()
        )
        if profile is None:
            logger.warning(
                "whatsapp_recipient_skip reason=no_student_profile student_id=%s",
                student_profile_id,
            )
            return None

        display = (profile.display_name or "Student").strip() or "Student"
        app_user = (
            self.db.query(AppUser).filter(AppUser.id == profile.user_id).first()
        )
        if app_user and app_user.phone:
            e164 = self.normalize_e164(app_user.phone)
            if e164:
                return NotificationRecipient(
                    phone_e164=e164,
                    source="app_user.phone",
                    student_profile_id=profile.id,
                    student_display_name=display,
                )

        if profile.guardian_contact:
            e164 = self.normalize_e164(profile.guardian_contact)
            if e164:
                return NotificationRecipient(
                    phone_e164=e164,
                    source="guardian_contact",
                    student_profile_id=profile.id,
                    student_display_name=display,
                )

        parent_phone = self._linked_parent_phone(profile.id)
        if parent_phone:
            e164 = self.normalize_e164(parent_phone)
            if e164:
                return NotificationRecipient(
                    phone_e164=e164,
                    source="parent.phone",
                    student_profile_id=profile.id,
                    student_display_name=display,
                )

        logger.info(
            "whatsapp_recipient_skip reason=no_phone student_id=%s",
            student_profile_id,
        )
        return None

    def _linked_parent_phone(self, student_profile_id: int) -> Optional[str]:
        links = (
            self.db.query(ParentStudentLink)
            .filter(
                ParentStudentLink.student_profile_id == student_profile_id,
                ParentStudentLink.status == "ACTIVE",
            )
            .all()
        )
        for link in links:
            parent = (
                self.db.query(ParentProfile)
                .filter(ParentProfile.id == link.parent_profile_id)
                .first()
            )
            if parent and (parent.phone or "").strip():
                return parent.phone
        return None

    @classmethod
    def normalize_e164(cls, raw: str | None) -> Optional[str]:
        """
        Normalize to E.164. Default +91 when exactly 10 digits (India pilot).
        Accepts already-prefixed + / 00 / country code forms.
        """
        if raw is None:
            return None
        text = str(raw).strip()
        if not text:
            return None

        if text.startswith("00"):
            text = "+" + text[2:]

        digits = re.sub(r"\D", "", text)
        if not digits:
            return None

        if text.startswith("+"):
            if len(digits) < 8 or len(digits) > 15:
                return None
            return f"+{digits}"

        if len(digits) == 10:
            return f"+{cls.DEFAULT_COUNTRY_CODE}{digits}"

        if len(digits) == 12 and digits.startswith(cls.DEFAULT_COUNTRY_CODE):
            return f"+{digits}"

        if 8 <= len(digits) <= 15:
            # Already includes country code without +
            return f"+{digits}"

        return None
