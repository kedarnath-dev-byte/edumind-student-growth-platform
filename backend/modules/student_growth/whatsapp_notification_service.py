"""Orchestrate revision-plan and morning-digest WhatsApp notifications."""

from __future__ import annotations

import logging
from collections import defaultdict
from datetime import date, datetime
from typing import Any, Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from modules.student_growth.ist_time import (
    format_due_at_ist,
    ist_calendar_date,
    ist_day_bounds_utc,
)
from modules.student_growth.models import (
    LearningLog,
    NotificationSend,
    RevisionTask,
    Subject,
    Topic,
)
from modules.student_growth.notification_recipient_service import (
    NotificationRecipientService,
)
from modules.student_growth.whatsapp_client import WhatsAppClient
from core.config import get_settings

logger = logging.getLogger(__name__)

KIND_REVISION_PLAN = "revision_plan"
KIND_MORNING_DIGEST = "morning_digest"


class WhatsAppNotificationService:
    """Send revision plan after log submit; morning digests for PENDING due today."""

    def __init__(self, db: Session, client: WhatsAppClient | None = None):
        self.db = db
        self.client = client or WhatsAppClient()
        self.recipients = NotificationRecipientService(db)
        self.settings = get_settings()

    def send_revision_plan_for_log(self, log_id: int) -> dict[str, Any]:
        log = self.db.query(LearningLog).filter(LearningLog.id == log_id).first()
        if log is None:
            logger.warning("whatsapp_revision_plan skip reason=log_not_found log_id=%s", log_id)
            return {"ok": False, "skipped": True, "reason": "log_not_found"}

        recipient = self.recipients.resolve_for_student(log.student_id)
        if recipient is None:
            return {"ok": False, "skipped": True, "reason": "no_phone"}

        tasks = (
            self.db.query(RevisionTask)
            .filter(RevisionTask.learning_log_id == log_id)
            .order_by(RevisionTask.due_at.asc())
            .all()
        )
        if not tasks:
            logger.info("whatsapp_revision_plan skip reason=no_tasks log_id=%s", log_id)
            return {"ok": False, "skipped": True, "reason": "no_tasks"}

        subject_name, topic_name = self._subject_topic_labels(log)
        lines = []
        for task in tasks:
            due = format_due_at_ist(task.due_at)
            lines.append(f"{task.revision_stage}: {due}")
        plan_block = "\n".join(lines)
        preview = (
            f"Hi {recipient.student_display_name}, your EduMind revision plan "
            f"for {subject_name} / {topic_name}:\n{plan_block}"
        )

        # Template body params (document exact bodies in docs):
        # {{1}} student name, {{2}} subject/topic, {{3}} five-line plan block
        result = self.client.send_template(
            to_e164=recipient.phone_e164,
            template_name=self.client.template_revision_plan(),
            body_parameters=[
                recipient.student_display_name,
                f"{subject_name} — {topic_name}",
                plan_block,
            ],
            preview_text=preview,
        )

        self._record_send(
            kind=KIND_REVISION_PLAN,
            student_id=log.student_id,
            day_key=f"log:{log_id}",
            phone_e164=recipient.phone_e164,
            source=recipient.source,
            status="dry_run" if result.get("dry_run") else ("sent" if result.get("ok") else "failed"),
            meta={
                "log_id": log_id,
                "message_id": result.get("message_id"),
                "error": result.get("error"),
            },
        )
        return {
            "ok": bool(result.get("ok")),
            "dry_run": bool(result.get("dry_run")),
            "skipped": False,
            "recipient_source": recipient.source,
            "result": result,
        }

    def send_morning_digests(self, for_date: date | None = None) -> dict[str, Any]:
        """
        One WhatsApp per student listing all PENDING revision_tasks due that IST day.

        Note: not all 5 stages from one log fall on the same calendar day.
        """
        day = for_date or ist_calendar_date()
        start_utc, end_utc = ist_day_bounds_utc(day)
        day_key = day.isoformat()

        tasks = (
            self.db.query(RevisionTask)
            .filter(
                RevisionTask.status == "PENDING",
                RevisionTask.due_at >= start_utc,
                RevisionTask.due_at < end_utc,
            )
            .order_by(RevisionTask.student_id.asc(), RevisionTask.due_at.asc())
            .all()
        )

        by_student: dict[int, list[RevisionTask]] = defaultdict(list)
        for task in tasks:
            by_student[task.student_id].append(task)

        summary = {
            "date_ist": day_key,
            "students_with_due": len(by_student),
            "sent": 0,
            "dry_run": 0,
            "skipped_no_phone": 0,
            "skipped_idempotent": 0,
            "failed": 0,
            "details": [],
        }

        for student_id, student_tasks in by_student.items():
            if self._already_sent(KIND_MORNING_DIGEST, student_id, day_key):
                summary["skipped_idempotent"] += 1
                summary["details"].append(
                    {"student_id": student_id, "status": "idempotent_skip"}
                )
                continue

            recipient = self.recipients.resolve_for_student(student_id)
            if recipient is None:
                summary["skipped_no_phone"] += 1
                summary["details"].append(
                    {"student_id": student_id, "status": "no_phone"}
                )
                continue

            bullets = []
            for task in student_tasks:
                log = (
                    self.db.query(LearningLog)
                    .filter(LearningLog.id == task.learning_log_id)
                    .first()
                )
                subject_name, topic_name = self._subject_topic_labels(log)
                bullets.append(
                    f"• {topic_name} ({subject_name}) — stage {task.revision_stage}"
                )
            bullet_block = "\n".join(bullets)
            preview = (
                f"Good morning {recipient.student_display_name}! "
                f"Revisions due {day.strftime('%d %b %Y')} (IST):\n{bullet_block}"
            )

            # Template: {{1}} student name, {{2}} date, {{3}} bullet list
            result = self.client.send_template(
                to_e164=recipient.phone_e164,
                template_name=self.client.template_morning_digest(),
                body_parameters=[
                    recipient.student_display_name,
                    day.strftime("%d %b %Y"),
                    bullet_block,
                ],
                preview_text=preview,
            )

            status = (
                "dry_run"
                if result.get("dry_run")
                else ("sent" if result.get("ok") else "failed")
            )
            recorded = self._record_send(
                kind=KIND_MORNING_DIGEST,
                student_id=student_id,
                day_key=day_key,
                phone_e164=recipient.phone_e164,
                source=recipient.source,
                status=status,
                meta={
                    "task_ids": [t.id for t in student_tasks],
                    "message_id": result.get("message_id"),
                    "error": result.get("error"),
                },
            )
            if not recorded and status in ("sent", "dry_run"):
                # Unique constraint race — treat as idempotent
                summary["skipped_idempotent"] += 1
                summary["details"].append(
                    {"student_id": student_id, "status": "idempotent_skip"}
                )
                continue

            if status == "dry_run":
                summary["dry_run"] += 1
            elif status == "sent":
                summary["sent"] += 1
            else:
                summary["failed"] += 1
            summary["details"].append(
                {
                    "student_id": student_id,
                    "status": status,
                    "task_count": len(student_tasks),
                    "recipient_source": recipient.source,
                }
            )

        return summary

    def _subject_topic_labels(
        self, log: Optional[LearningLog]
    ) -> tuple[str, str]:
        subject_name = "Subject"
        topic_name = "Topic"
        if log is None:
            return subject_name, topic_name
        if log.subject_id:
            subject = self.db.query(Subject).filter(Subject.id == log.subject_id).first()
            if subject and subject.name:
                subject_name = subject.name
        if log.topic_id:
            topic = self.db.query(Topic).filter(Topic.id == log.topic_id).first()
            if topic and topic.name:
                topic_name = topic.name
        elif (log.taught_today or "").strip():
            topic_name = (log.taught_today or "").strip()[:80]
        return subject_name, topic_name

    def _already_sent(self, kind: str, student_id: int, day_key: str) -> bool:
        existing = (
            self.db.query(NotificationSend)
            .filter(
                NotificationSend.kind == kind,
                NotificationSend.student_id == student_id,
                NotificationSend.day_key == day_key,
            )
            .first()
        )
        return existing is not None

    def _record_send(
        self,
        *,
        kind: str,
        student_id: int,
        day_key: str,
        phone_e164: str,
        source: str,
        status: str,
        meta: dict[str, Any] | None = None,
    ) -> bool:
        row = NotificationSend(
            kind=kind,
            student_id=student_id,
            day_key=day_key,
            phone_e164=phone_e164,
            recipient_source=source,
            status=status,
            meta_json=meta or {},
            created_at=datetime.utcnow(),
        )
        try:
            self.db.add(row)
            self.db.commit()
            return True
        except IntegrityError:
            self.db.rollback()
            logger.info(
                "whatsapp_idempotent_skip kind=%s student_id=%s day=%s",
                kind,
                student_id,
                day_key,
            )
            return False
        except Exception:
            self.db.rollback()
            logger.exception(
                "whatsapp_record_send_failed kind=%s student_id=%s",
                kind,
                student_id,
            )
            return False
