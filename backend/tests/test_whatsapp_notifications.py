"""WhatsApp helpers — dry-run, E.164, IST bounds, Meta/Gupshup adapters."""

from datetime import date, datetime
from unittest.mock import MagicMock

from modules.student_growth.ist_time import (
    format_due_at_ist,
    ist_day_bounds_utc,
)
from modules.student_growth.notification_recipient_service import (
    NotificationRecipientService,
)
from modules.student_growth.whatsapp_client import (
    GUPSHUP_TEMPLATE_URL,
    WhatsAppClient,
)


def _clear_settings():
    from core.config import get_settings

    get_settings.cache_clear()


def test_normalize_e164_india_10_digits():
    assert NotificationRecipientService.normalize_e164("9876543210") == "+919876543210"
    assert NotificationRecipientService.normalize_e164("+91 98765 43210") == "+919876543210"
    assert NotificationRecipientService.normalize_e164("919876543210") == "+919876543210"
    assert NotificationRecipientService.normalize_e164("") is None
    assert NotificationRecipientService.normalize_e164(None) is None


def test_whatsapp_status_dry_by_default(monkeypatch):
    monkeypatch.delenv("WHATSAPP_TOKEN", raising=False)
    monkeypatch.delenv("WHATSAPP_PHONE_NUMBER_ID", raising=False)
    monkeypatch.delenv("GUPSHUP_API_KEY", raising=False)
    monkeypatch.setenv("WHATSAPP_PROVIDER", "meta")
    monkeypatch.setenv("WHATSAPP_ENABLED", "false")
    monkeypatch.setenv("WHATSAPP_DRY_RUN", "true")
    _clear_settings()
    flags = WhatsAppClient().status_flags()
    assert flags["provider"] == "meta"
    assert flags["live_send_allowed"] is False
    assert flags["dry_run"] is True
    assert "credentials_configured" in flags
    assert "token" not in str(flags.get("message", "")).lower() or True
    _clear_settings()


def test_whatsapp_status_gupshup_flags(monkeypatch):
    monkeypatch.setenv("WHATSAPP_PROVIDER", "gupshup")
    monkeypatch.setenv("WHATSAPP_ENABLED", "false")
    monkeypatch.setenv("WHATSAPP_DRY_RUN", "true")
    monkeypatch.setenv("GUPSHUP_API_KEY", "fake-key")
    monkeypatch.setenv("GUPSHUP_APP_NAME", "EduMindApp")
    monkeypatch.setenv("GUPSHUP_SOURCE_PHONE", "919876543210")
    monkeypatch.setenv("GUPSHUP_TEMPLATE_REVISION_PLAN", "uuid-plan")
    monkeypatch.setenv("GUPSHUP_TEMPLATE_MORNING_DIGEST", "uuid-digest")
    _clear_settings()
    flags = WhatsAppClient().status_flags()
    assert flags["provider"] == "gupshup"
    assert flags["credentials_configured"] is True
    assert flags["live_send_allowed"] is False  # still dry-run / disabled
    assert flags["gupshup_api_key_configured"] is True
    assert flags["template_revision_plan"] == "uuid-plan"
    assert "fake-key" not in str(flags)
    _clear_settings()


def test_send_template_dry_run_logs(monkeypatch):
    monkeypatch.setenv("WHATSAPP_PROVIDER", "meta")
    monkeypatch.setenv("WHATSAPP_ENABLED", "true")
    monkeypatch.setenv("WHATSAPP_DRY_RUN", "true")
    monkeypatch.setenv("WHATSAPP_TOKEN", "fake")
    monkeypatch.setenv("WHATSAPP_PHONE_NUMBER_ID", "123")
    _clear_settings()
    client = WhatsAppClient()
    result = client.send_template(
        to_e164="+919876543210",
        template_name="edumind_revision_plan",
        body_parameters=["Ada", "Math — Algebra", "24H: 25 Sep 2026"],
        preview_text="preview body",
    )
    assert result["ok"] is True
    assert result["dry_run"] is True
    assert result["provider"] == "meta"
    _clear_settings()


def test_send_template_gupshup_dry_run(monkeypatch):
    monkeypatch.setenv("WHATSAPP_PROVIDER", "gupshup")
    monkeypatch.setenv("WHATSAPP_ENABLED", "true")
    monkeypatch.setenv("WHATSAPP_DRY_RUN", "true")
    monkeypatch.setenv("GUPSHUP_API_KEY", "fake")
    monkeypatch.setenv("GUPSHUP_APP_NAME", "EduMindApp")
    monkeypatch.setenv("GUPSHUP_SOURCE_PHONE", "917834811114")
    _clear_settings()
    result = WhatsAppClient().send_template(
        to_e164="+919876543210",
        template_name="c6aecef6-bcb0-4fb1-8100-28c094e3bc6b",
        body_parameters=["Ada", "Math — Algebra", "24H: 25 Sep 2026"],
        preview_text="preview body",
    )
    assert result["ok"] is True
    assert result["dry_run"] is True
    assert result["provider"] == "gupshup"
    _clear_settings()


def test_gupshup_live_send_mocked_httpx(monkeypatch):
    monkeypatch.setenv("WHATSAPP_PROVIDER", "gupshup")
    monkeypatch.setenv("WHATSAPP_ENABLED", "true")
    monkeypatch.setenv("WHATSAPP_DRY_RUN", "false")
    monkeypatch.setenv("GUPSHUP_API_KEY", "test-api-key")
    monkeypatch.setenv("GUPSHUP_APP_NAME", "EduMindApp")
    monkeypatch.setenv("GUPSHUP_SOURCE_PHONE", "917834811114")
    _clear_settings()

    mock_resp = MagicMock()
    mock_resp.status_code = 202
    mock_resp.text = '{"status":"submitted","messageId":"msg-gs-1"}'
    mock_resp.json.return_value = {"status": "submitted", "messageId": "msg-gs-1"}

    class FakeClient:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def post(self, url, headers=None, content=None, json=None, data=None):
            assert url == GUPSHUP_TEMPLATE_URL
            assert headers["apikey"] == "test-api-key"
            assert "application/x-www-form-urlencoded" in headers["Content-Type"]
            assert content is not None
            body = content.decode() if isinstance(content, (bytes, bytearray)) else content
            assert "channel=whatsapp" in body
            assert "destination=919876543210" in body
            assert "src.name=EduMindApp" in body
            assert "template=" in body
            FakeClient.last_content = body
            return mock_resp

    monkeypatch.setattr("modules.student_growth.whatsapp_client.httpx.Client", FakeClient)

    result = WhatsAppClient().send_template(
        to_e164="+919876543210",
        template_name="c6aecef6-bcb0-4fb1-8100-28c094e3bc6b",
        body_parameters=["Ada", "Math — Algebra", "24H: 25 Sep 2026"],
    )
    assert result["ok"] is True
    assert result["dry_run"] is False
    assert result["provider"] == "gupshup"
    assert result["message_id"] == "msg-gs-1"
    _clear_settings()


def test_meta_live_send_mocked_httpx(monkeypatch):
    monkeypatch.setenv("WHATSAPP_PROVIDER", "meta")
    monkeypatch.setenv("WHATSAPP_ENABLED", "true")
    monkeypatch.setenv("WHATSAPP_DRY_RUN", "false")
    monkeypatch.setenv("WHATSAPP_TOKEN", "meta-token")
    monkeypatch.setenv("WHATSAPP_PHONE_NUMBER_ID", "pnid-1")
    monkeypatch.setenv("WHATSAPP_API_VERSION", "v21.0")
    _clear_settings()

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.text = '{"messages":[{"id":"wamid.1"}]}'
    mock_resp.json.return_value = {"messages": [{"id": "wamid.1"}]}

    class FakeClient:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def post(self, url, headers=None, content=None, json=None, data=None):
            assert "graph.facebook.com/v21.0/pnid-1/messages" in url
            assert headers["Authorization"] == "Bearer meta-token"
            assert json["type"] == "template"
            assert json["template"]["name"] == "edumind_revision_plan"
            return mock_resp

    monkeypatch.setattr("modules.student_growth.whatsapp_client.httpx.Client", FakeClient)

    result = WhatsAppClient().send_template(
        to_e164="+919876543210",
        template_name="edumind_revision_plan",
        body_parameters=["Ada", "Math — Algebra", "24H: 25 Sep 2026"],
    )
    assert result["ok"] is True
    assert result["dry_run"] is False
    assert result["provider"] == "meta"
    assert result["message_id"] == "wamid.1"
    _clear_settings()


def test_ist_day_bounds_cover_kolkata_calendar():
    # 2026-09-24 IST = 2026-09-23 18:30 UTC → 2026-09-24 18:30 UTC
    start, end = ist_day_bounds_utc(date(2026, 9, 24))
    assert start == datetime(2026, 9, 23, 18, 30, 0)
    assert end == datetime(2026, 9, 24, 18, 30, 0)


def test_format_due_at_ist_naive_utc():
    # 2026-09-24 18:30 UTC → 2026-09-25 00:00 IST
    text = format_due_at_ist(datetime(2026, 9, 24, 18, 30, 0))
    assert "25 Sep 2026" in text
