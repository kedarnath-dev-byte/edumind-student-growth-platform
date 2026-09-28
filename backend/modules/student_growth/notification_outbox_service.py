"""WhatsApp notification outbox — enqueue intents; drain without blocking log create.

System Design (Messenger pattern / Saga): write intent row first; worker/cron
sends. Never flip WHATSAPP_DRY_RUN here — client still respects env.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from modules.student_growth.models import NotificationOutbox

logger = logging.getLogger(__name__)

KIND_REVISION_PLAN = "revision_plan"
KIND_MORNING_DIGEST = "morning_digest"

STATUS_PENDING = "pending"
STATUS_PROCESSING = "processing"
STATUS_SENT = "sent"
STATUS_DRY_RUN = "dry_run"
STATUS_FAILED = "failed"
STATUS_SKIPPED = "skipped"


class NotificationOutboxService:
    def __init__(self, db: Session):
        self.db = db

    def enqueue_revision_plan(
        self,
        *,
        learning_log_id: int,
        student_id: int,
        payload: Optional[dict] = None,
    ) -> Optional[NotificationOutbox]:
        key = f"revision_plan:log:{learning_log_id}"
        return self._enqueue(
            kind=KIND_REVISION_PLAN,
            idempotency_key=key,
            student_id=student_id,
            learning_log_id=learning_log_id,
            payload=payload or {},
        )

    def enqueue_morning_digest(
        self,
        *,
        student_id: int,
        day_key: str,
        payload: Optional[dict] = None,
    ) -> Optional[NotificationOutbox]:
        key = f"morning_digest:student:{student_id}:day:{day_key}"
        return self._enqueue(
            kind=KIND_MORNING_DIGEST,
            idempotency_key=key,
            student_id=student_id,
            learning_log_id=None,
            payload=payload or {"day_key": day_key},
        )

    def _enqueue(
        self,
        *,
        kind: str,
        idempotency_key: str,
        student_id: Optional[int],
        learning_log_id: Optional[int],
        payload: dict,
    ) -> Optional[NotificationOutbox]:
        existing = (
            self.db.query(NotificationOutbox)
            .filter(NotificationOutbox.idempotency_key == idempotency_key)
            .first()
        )
        if existing is not None:
            return existing

        row = NotificationOutbox(
            kind=kind,
            student_id=student_id,
            learning_log_id=learning_log_id,
            payload_json=payload,
            status=STATUS_PENDING,
            attempts=0,
            idempotency_key=idempotency_key,
        )
        self.db.add(row)
        try:
            self.db.commit()
            self.db.refresh(row)
            return row
        except IntegrityError:
            self.db.rollback()
            return (
                self.db.query(NotificationOutbox)
                .filter(NotificationOutbox.idempotency_key == idempotency_key)
                .first()
            )
        except Exception:
            self.db.rollback()
            logger.exception("notification_outbox_enqueue_failed key=%s", idempotency_key)
            return None

    def drain_pending(self, *, limit: int = 50) -> dict[str, Any]:
        """Process pending outbox rows. Safe under dry-run (records dry_run/sent/skip)."""
        from modules.student_growth.whatsapp_notification_service import (
            WhatsAppNotificationService,
        )

        rows = (
            self.db.query(NotificationOutbox)
            .filter(NotificationOutbox.status == STATUS_PENDING)
            .order_by(NotificationOutbox.created_at.asc())
            .limit(limit)
            .all()
        )
        summary = {
            "claimed": len(rows),
            "sent": 0,
            "dry_run": 0,
            "skipped": 0,
            "failed": 0,
            "details": [],
        }
        wa = WhatsAppNotificationService(self.db)
        for row in rows:
            row.status = STATUS_PROCESSING
            row.attempts = int(row.attempts or 0) + 1
            self.db.commit()
            try:
                result = self._process_row(wa, row)
                status = str(result.get("status") or STATUS_SKIPPED)
                if status == "sent":
                    row.status = STATUS_SENT
                    summary["sent"] += 1
                elif status == "dry_run":
                    row.status = STATUS_DRY_RUN
                    summary["dry_run"] += 1
                elif status in ("skipped", "skipped_no_phone", "skipped_idempotent"):
                    row.status = STATUS_SKIPPED
                    summary["skipped"] += 1
                else:
                    row.status = STATUS_FAILED
                    row.last_error = str(result.get("error") or status)[:500]
                    summary["failed"] += 1
                row.processed_at = datetime.utcnow()
                self.db.commit()
                summary["details"].append(
                    {
                        "id": row.id,
                        "kind": row.kind,
                        "status": row.status,
                        "result": result,
                    }
                )
            except Exception as exc:
                logger.exception("notification_outbox_drain_failed id=%s", row.id)
                row.status = STATUS_FAILED
                row.last_error = str(exc)[:500]
                row.processed_at = datetime.utcnow()
                self.db.commit()
                summary["failed"] += 1
                summary["details"].append(
                    {"id": row.id, "kind": row.kind, "status": STATUS_FAILED, "error": str(exc)}
                )
        return summary

    def _process_row(self, wa: Any, row: NotificationOutbox) -> dict:
        if row.kind == KIND_REVISION_PLAN:
            if not row.learning_log_id:
                return {"status": "skipped", "error": "missing learning_log_id"}
            raw = wa.send_revision_plan_for_log(row.learning_log_id) or {}
            if raw.get("skipped"):
                return {"status": "skipped", "reason": raw.get("reason"), "raw": raw}
            if raw.get("dry_run"):
                return {"status": "dry_run", "raw": raw}
            if raw.get("ok"):
                return {"status": "sent", "raw": raw}
            return {
                "status": "failed",
                "error": str(raw.get("error") or raw.get("reason") or "send_failed"),
                "raw": raw,
            }
        if row.kind == KIND_MORNING_DIGEST:
            # Morning digests stay on the bulk morning-revision-whatsapp job.
            return {
                "status": "skipped",
                "error": "use morning-revision-whatsapp job for digests",
            }
        return {"status": "failed", "error": f"unknown kind {row.kind}"}
