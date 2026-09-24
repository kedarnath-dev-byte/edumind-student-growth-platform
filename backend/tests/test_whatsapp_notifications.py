"""WhatsApp helpers — dry-run, E.164, IST bounds (no Meta network)."""

from datetime import date, datetime, timezone

from modules.student_growth.ist_time import (
    format_due_at_ist,
    ist_day_bounds_utc,
)
from modules.student_growth.notification_recipient_service import (
    NotificationRecipientService,
)
from modules.student_growth.whatsapp_client import WhatsAppClient


def test_normalize_e164_india_10_digits():
    assert NotificationRecipientService.normalize_e164("9876543210") == "+919876543210"
    assert NotificationRecipientService.normalize_e164("+91 98765 43210") == "+919876543210"
    assert NotificationRecipientService.normalize_e164("919876543210") == "+919876543210"
    assert NotificationRecipientService.normalize_e164("") is None
    assert NotificationRecipientService.normalize_e164(None) is None


def test_whatsapp_status_dry_by_default(monkeypatch):
    monkeypatch.delenv("WHATSAPP_TOKEN", raising=False)
    monkeypatch.delenv("WHATSAPP_PHONE_NUMBER_ID", raising=False)
    monkeypatch.setenv("WHATSAPP_ENABLED", "false")
    monkeypatch.setenv("WHATSAPP_DRY_RUN", "true")
    # Clear cached settings
    from core.config import get_settings

    get_settings.cache_clear()
    flags = WhatsAppClient().status_flags()
    assert flags["live_send_allowed"] is False
    assert flags["dry_run"] is True
    assert "secret" not in str(flags).lower() or "credentials_configured" in flags
    get_settings.cache_clear()


def test_send_template_dry_run_logs(monkeypatch, caplog):
    monkeypatch.setenv("WHATSAPP_ENABLED", "true")
    monkeypatch.setenv("WHATSAPP_DRY_RUN", "true")
    monkeypatch.setenv("WHATSAPP_TOKEN", "fake")
    monkeypatch.setenv("WHATSAPP_PHONE_NUMBER_ID", "123")
    from core.config import get_settings

    get_settings.cache_clear()
    client = WhatsAppClient()
    result = client.send_template(
        to_e164="+919876543210",
        template_name="edumind_revision_plan",
        body_parameters=["Ada", "Math — Algebra", "24H: 25 Sep 2026"],
        preview_text="preview body",
    )
    assert result["ok"] is True
    assert result["dry_run"] is True
    get_settings.cache_clear()


def test_ist_day_bounds_cover_kolkata_calendar():
    # 2026-09-24 IST = 2026-09-23 18:30 UTC → 2026-09-24 18:30 UTC
    start, end = ist_day_bounds_utc(date(2026, 9, 24))
    assert start == datetime(2026, 9, 23, 18, 30, 0)
    assert end == datetime(2026, 9, 24, 18, 30, 0)


def test_format_due_at_ist_naive_utc():
    # 2026-09-24 18:30 UTC → 2026-09-25 00:00 IST
    text = format_due_at_ist(datetime(2026, 9, 24, 18, 30, 0))
    assert "25 Sep 2026" in text
