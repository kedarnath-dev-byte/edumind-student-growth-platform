"""
WhatsApp client for EduMind revision notifications.

Supports two providers via WHATSAPP_PROVIDER:
  - meta     — Meta WhatsApp Cloud API (default)
  - gupshup  — Gupshup Enterprise WhatsApp (form-urlencoded)

Dry-run by default: logs the intended payload and does not call any provider
until WHATSAPP_ENABLED=true, WHATSAPP_DRY_RUN=false, and provider credentials
are set.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Optional
from urllib.parse import urlencode

import httpx

from core.config import get_settings

logger = logging.getLogger(__name__)

PROVIDER_META = "meta"
PROVIDER_GUPSHUP = "gupshup"
GUPSHUP_TEMPLATE_URL = "https://api.gupshup.io/wa/api/v1/template/msg"
GUPSHUP_SESSION_URL = "https://api.gupshup.io/wa/api/v1/msg"


class WhatsAppClient:
    """Thin wrapper around Meta Cloud API or Gupshup WhatsApp send endpoints."""

    def __init__(self) -> None:
        self.settings = get_settings()

    def provider(self) -> str:
        raw = (getattr(self.settings, "whatsapp_provider", None) or PROVIDER_META)
        value = str(raw).strip().lower()
        if value in (PROVIDER_META, PROVIDER_GUPSHUP):
            return value
        return PROVIDER_META

    def is_live_send_allowed(self) -> bool:
        s = self.settings
        if not (s.whatsapp_enabled and not s.whatsapp_dry_run):
            return False
        return self._credentials_configured()

    def _credentials_configured(self) -> bool:
        s = self.settings
        if self.provider() == PROVIDER_GUPSHUP:
            return bool(
                (s.gupshup_api_key or "").strip()
                and (s.gupshup_app_name or "").strip()
                and (s.gupshup_source_phone or "").strip()
            )
        return bool(
            (s.whatsapp_token or "").strip()
            and (s.whatsapp_phone_number_id or "").strip()
        )

    def template_revision_plan(self) -> str:
        """Meta: template name. Gupshup: template UUID (id field)."""
        s = self.settings
        if self.provider() == PROVIDER_GUPSHUP:
            return (
                (s.gupshup_template_revision_plan or "").strip()
                or (s.whatsapp_template_revision_plan or "").strip()
            )
        return (s.whatsapp_template_revision_plan or "").strip()

    def template_morning_digest(self) -> str:
        """Meta: template name. Gupshup: template UUID (id field)."""
        s = self.settings
        if self.provider() == PROVIDER_GUPSHUP:
            return (
                (s.gupshup_template_morning_digest or "").strip()
                or (s.whatsapp_template_morning_digest or "").strip()
            )
        return (s.whatsapp_template_morning_digest or "").strip()

    def status_flags(self) -> dict[str, Any]:
        s = self.settings
        provider = self.provider()
        creds = self._credentials_configured()
        flags: dict[str, Any] = {
            "provider": provider,
            "enabled": bool(s.whatsapp_enabled),
            "dry_run": bool(s.whatsapp_dry_run),
            "credentials_configured": creds,
            "template_revision_plan": self.template_revision_plan(),
            "template_morning_digest": self.template_morning_digest(),
            "live_send_allowed": self.is_live_send_allowed(),
            "message": (
                f"WhatsApp live sends are active ({provider})."
                if self.is_live_send_allowed()
                else f"WhatsApp dry-run / disabled ({provider}) — messages are logged only."
            ),
        }
        if provider == PROVIDER_META:
            flags["api_version"] = s.whatsapp_api_version
            flags["meta_token_configured"] = bool((s.whatsapp_token or "").strip())
            flags["meta_phone_number_id_configured"] = bool(
                (s.whatsapp_phone_number_id or "").strip()
            )
        else:
            flags["gupshup_api_key_configured"] = bool((s.gupshup_api_key or "").strip())
            flags["gupshup_app_name_configured"] = bool((s.gupshup_app_name or "").strip())
            flags["gupshup_source_phone_configured"] = bool(
                (s.gupshup_source_phone or "").strip()
            )
        return flags

    def send_template(
        self,
        *,
        to_e164: str,
        template_name: str,
        language_code: str = "en",
        body_parameters: Optional[list[str]] = None,
        preview_text: str = "",
    ) -> dict[str, Any]:
        """
        Send a pre-approved WhatsApp template message.

        body_parameters map to {{1}}, {{2}}, ... (Meta) / ordered params (Gupshup).
        template_name is Meta template name or Gupshup template UUID depending on provider.
        """
        params = [str(p)[:1024] for p in (body_parameters or [])]
        preview = preview_text or f"template:{template_name}"

        if not self.is_live_send_allowed():
            return self._dry_run_result(
                kind="template",
                to_e164=to_e164,
                preview_text=preview,
                extra={
                    "provider": self.provider(),
                    "template": template_name,
                    "body_parameters": params,
                },
            )

        if self.provider() == PROVIDER_GUPSHUP:
            return self._send_gupshup_template(
                to_e164=to_e164,
                template_id=template_name,
                params=params,
                preview_text=preview,
            )
        return self._send_meta_template(
            to_e164=to_e164,
            template_name=template_name,
            language_code=language_code,
            params=params,
            preview_text=preview,
        )

    def send_text(
        self,
        *,
        to_e164: str,
        body: str,
    ) -> dict[str, Any]:
        """
        Send a free-form text message (session / sandbox only).

        Prefer templates for production revision reminders.
        """
        text = body[:4096]
        if not self.is_live_send_allowed():
            return self._dry_run_result(
                kind="text",
                to_e164=to_e164,
                preview_text=text,
                extra={"provider": self.provider()},
            )

        if self.provider() == PROVIDER_GUPSHUP:
            return self._send_gupshup_session_text(to_e164=to_e164, body=text)
        return self._send_meta_text(to_e164=to_e164, body=text)

    def _dry_run_result(
        self,
        *,
        kind: str,
        to_e164: str,
        preview_text: str,
        extra: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        logger.info(
            "whatsapp_dry_run provider=%s kind=%s to=%s preview=%s",
            self.provider(),
            kind,
            self._mask_phone(to_e164),
            (preview_text or "")[:500],
        )
        result: dict[str, Any] = {
            "ok": True,
            "dry_run": True,
            "kind": kind,
            "provider": self.provider(),
            "to": to_e164,
            "preview": preview_text,
        }
        if extra:
            result.update(extra)
        return result

    def _send_meta_template(
        self,
        *,
        to_e164: str,
        template_name: str,
        language_code: str,
        params: list[str],
        preview_text: str,
    ) -> dict[str, Any]:
        components: list[dict[str, Any]] = []
        if params:
            components.append(
                {
                    "type": "body",
                    "parameters": [{"type": "text", "text": p} for p in params],
                }
            )
        payload = {
            "messaging_product": "whatsapp",
            "to": to_e164.lstrip("+"),
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": language_code},
                "components": components,
            },
        }
        return self._post_meta_json(
            kind="template",
            to_e164=to_e164,
            payload=payload,
            preview_text=preview_text,
        )

    def _send_meta_text(self, *, to_e164: str, body: str) -> dict[str, Any]:
        payload = {
            "messaging_product": "whatsapp",
            "to": to_e164.lstrip("+"),
            "type": "text",
            "text": {"preview_url": False, "body": body},
        }
        return self._post_meta_json(
            kind="text",
            to_e164=to_e164,
            payload=payload,
            preview_text=body,
        )

    def _post_meta_json(
        self,
        *,
        kind: str,
        to_e164: str,
        payload: dict[str, Any],
        preview_text: str,
    ) -> dict[str, Any]:
        s = self.settings
        url = (
            f"https://graph.facebook.com/{s.whatsapp_api_version}/"
            f"{s.whatsapp_phone_number_id}/messages"
        )
        headers = {
            "Authorization": f"Bearer {s.whatsapp_token}",
            "Content-Type": "application/json",
        }
        try:
            with httpx.Client(timeout=30.0) as client:
                resp = client.post(url, headers=headers, json=payload)
        except Exception as exc:
            return self._transport_error(kind=kind, to_e164=to_e164, exc=exc)

        if resp.status_code >= 400:
            return self._http_error(kind=kind, to_e164=to_e164, resp=resp)

        data = self._safe_json(resp)
        message_id = None
        try:
            message_id = (data.get("messages") or [{}])[0].get("id")
        except Exception:
            message_id = None
        logger.info(
            "whatsapp_sent provider=meta kind=%s to=%s message_id=%s",
            kind,
            self._mask_phone(to_e164),
            message_id,
        )
        return {
            "ok": True,
            "dry_run": False,
            "kind": kind,
            "provider": PROVIDER_META,
            "message_id": message_id,
            "response": data,
        }

    def _send_gupshup_template(
        self,
        *,
        to_e164: str,
        template_id: str,
        params: list[str],
        preview_text: str,
    ) -> dict[str, Any]:
        s = self.settings
        form = {
            "channel": "whatsapp",
            "source": self._digits_only(s.gupshup_source_phone),
            "destination": self._digits_only(to_e164),
            "src.name": (s.gupshup_app_name or "").strip(),
            "template": json.dumps({"id": template_id, "params": params}),
        }
        return self._post_gupshup_form(
            kind="template",
            url=GUPSHUP_TEMPLATE_URL,
            to_e164=to_e164,
            form=form,
            preview_text=preview_text,
        )

    def _send_gupshup_session_text(self, *, to_e164: str, body: str) -> dict[str, Any]:
        s = self.settings
        form = {
            "channel": "whatsapp",
            "source": self._digits_only(s.gupshup_source_phone),
            "destination": self._digits_only(to_e164),
            "src.name": (s.gupshup_app_name or "").strip(),
            "message": json.dumps({"type": "text", "text": body}),
        }
        return self._post_gupshup_form(
            kind="text",
            url=GUPSHUP_SESSION_URL,
            to_e164=to_e164,
            form=form,
            preview_text=body,
        )

    def _post_gupshup_form(
        self,
        *,
        kind: str,
        url: str,
        to_e164: str,
        form: dict[str, str],
        preview_text: str,
    ) -> dict[str, Any]:
        s = self.settings
        headers = {
            "apikey": (s.gupshup_api_key or "").strip(),
            "Content-Type": "application/x-www-form-urlencoded",
        }
        # Build body ourselves so "src.name" key is preserved (httpx data= may be fine too).
        body = urlencode(form)
        try:
            with httpx.Client(timeout=30.0) as client:
                resp = client.post(url, headers=headers, content=body)
        except Exception as exc:
            return self._transport_error(kind=kind, to_e164=to_e164, exc=exc)

        if resp.status_code >= 400:
            return self._http_error(kind=kind, to_e164=to_e164, resp=resp)

        data = self._safe_json(resp)
        # Gupshup async accept is typically 200–299 with status submitted/success.
        status = str(data.get("status") or "").lower()
        if status in ("error", "failed"):
            logger.error(
                "whatsapp_api_error provider=gupshup kind=%s to=%s detail=%s",
                kind,
                self._mask_phone(to_e164),
                str(data)[:300],
            )
            return {
                "ok": False,
                "dry_run": False,
                "kind": kind,
                "provider": PROVIDER_GUPSHUP,
                "error": str(data.get("message") or data)[:300],
                "response": data,
            }

        message_id = data.get("messageId") or data.get("message_id")
        logger.info(
            "whatsapp_sent provider=gupshup kind=%s to=%s message_id=%s",
            kind,
            self._mask_phone(to_e164),
            message_id,
        )
        return {
            "ok": True,
            "dry_run": False,
            "kind": kind,
            "provider": PROVIDER_GUPSHUP,
            "message_id": message_id,
            "response": data,
        }

    def _transport_error(
        self, *, kind: str, to_e164: str, exc: Exception
    ) -> dict[str, Any]:
        logger.exception(
            "whatsapp_send_failed provider=%s kind=%s to=%s err=%s",
            self.provider(),
            kind,
            self._mask_phone(to_e164),
            exc,
        )
        return {
            "ok": False,
            "dry_run": False,
            "kind": kind,
            "provider": self.provider(),
            "error": str(exc),
        }

    def _http_error(
        self, *, kind: str, to_e164: str, resp: httpx.Response
    ) -> dict[str, Any]:
        detail = resp.text[:300]
        logger.error(
            "whatsapp_api_error provider=%s status=%s to=%s detail=%s",
            self.provider(),
            resp.status_code,
            self._mask_phone(to_e164),
            detail,
        )
        return {
            "ok": False,
            "dry_run": False,
            "kind": kind,
            "provider": self.provider(),
            "status_code": resp.status_code,
            "error": detail,
        }

    @staticmethod
    def _safe_json(resp: httpx.Response) -> dict[str, Any]:
        try:
            data = resp.json() or {}
            return data if isinstance(data, dict) else {"raw": data}
        except Exception:
            return {}

    @staticmethod
    def _digits_only(value: str | None) -> str:
        return "".join(c for c in (value or "") if c.isdigit())

    @staticmethod
    def _mask_phone(phone: str) -> str:
        digits = "".join(c for c in (phone or "") if c.isdigit())
        if len(digits) < 4:
            return "***"
        return f"+***{digits[-4:]}"
