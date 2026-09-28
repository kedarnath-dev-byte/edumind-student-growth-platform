"""WhatsApp status + internal morning-digest job endpoints."""

from __future__ import annotations

import hmac
from datetime import date, datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from core.config import get_settings
from core.database import get_db
from modules.student_growth.ist_time import ist_calendar_date
from modules.student_growth.whatsapp_client import WhatsAppClient
from modules.student_growth.whatsapp_notification_service import (
    WhatsAppNotificationService,
)

router = APIRouter(tags=["WhatsApp"])


class WhatsAppStatusResponse(BaseModel):
    provider: str
    enabled: bool
    dry_run: bool
    credentials_configured: bool
    template_revision_plan: str
    template_morning_digest: str
    live_send_allowed: bool
    message: str
    # Provider-specific configured flags (never secrets)
    api_version: Optional[str] = None
    meta_token_configured: Optional[bool] = None
    meta_phone_number_id_configured: Optional[bool] = None
    gupshup_api_key_configured: Optional[bool] = None
    gupshup_app_name_configured: Optional[bool] = None
    gupshup_source_phone_configured: Optional[bool] = None


class MorningDigestJobResponse(BaseModel):
    ok: bool = True
    date_ist: str
    students_with_due: int = 0
    sent: int = 0
    dry_run: int = 0
    skipped_no_phone: int = 0
    skipped_idempotent: int = 0
    failed: int = 0
    details: list = Field(default_factory=list)


def _require_internal_job_secret(
    x_internal_job_secret: Optional[str] = Header(default=None, alias="X-Internal-Job-Secret"),
) -> None:
    settings = get_settings()
    expected = (settings.internal_job_secret or "").strip()
    if not expected:
        raise HTTPException(
            status_code=503,
            detail="INTERNAL_JOB_SECRET is not configured on this server.",
        )
    provided = (x_internal_job_secret or "").strip()
    if not provided or not hmac.compare_digest(provided, expected):
        raise HTTPException(status_code=401, detail="Invalid or missing job secret.")


@router.get("/api/v1/whatsapp/status", response_model=WhatsAppStatusResponse)
async def whatsapp_status():
    """Public-ish readiness probe (configured flags only — no secrets)."""
    flags: dict[str, Any] = WhatsAppClient().status_flags()
    return WhatsAppStatusResponse(**flags)


@router.post(
    "/api/v1/internal/jobs/morning-revision-whatsapp",
    response_model=MorningDigestJobResponse,
)
async def morning_revision_whatsapp_job(
    for_date: Optional[str] = Query(
        default=None,
        description="Optional IST calendar date YYYY-MM-DD (defaults to today IST).",
    ),
    db: Session = Depends(get_db),
    _: None = Depends(_require_internal_job_secret),
):
    """Cron target: send one morning digest per student with PENDING revisions due today IST."""
    day: date
    if for_date:
        try:
            day = datetime.strptime(for_date, "%Y-%m-%d").date()
        except ValueError as exc:
            raise HTTPException(
                status_code=400,
                detail="for_date must be YYYY-MM-DD",
            ) from exc
    else:
        day = ist_calendar_date()

    summary = WhatsAppNotificationService(db).send_morning_digests(for_date=day)
    return MorningDigestJobResponse(ok=True, **summary)
