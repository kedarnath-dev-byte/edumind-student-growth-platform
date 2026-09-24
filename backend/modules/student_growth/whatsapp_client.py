"""
Meta WhatsApp Cloud API client for EduMind revision notifications.

Dry-run by default: logs the intended payload and does not call Meta until
WHATSAPP_ENABLED=true, WHATSAPP_DRY_RUN=false, and credentials are set.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

import httpx

from core.config import get_settings

logger = logging.getLogger(__name__)


class WhatsAppClient:
    """Thin wrapper around Meta Cloud API send endpoints."""

    def __init__(self) -> None:
        self.settings = get_settings()

    def is_live_send_allowed(self) -> bool:
        s = self.settings
        return bool(
            s.whatsapp_enabled
            and not s.whatsapp_dry_run
            and (s.whatsapp_token or "").strip()
            and (s.whatsapp_phone_number_id or "").strip()
        )

    def status_flags(self) -> dict[str, Any]:
        s = self.settings
        token_set = bool((s.whatsapp_token or "").strip())
        phone_id_set = bool((s.whatsapp_phone_number_id or "").strip())
        return {
            "enabled": bool(s.whatsapp_enabled),
            "dry_run": bool(s.whatsapp_dry_run),
            "credentials_configured": token_set and phone_id_set,
            "api_version": s.whatsapp_api_version,
            "template_revision_plan": s.whatsapp_template_revision_plan,
            "template_morning_digest": s.whatsapp_template_morning_digest,
            "live_send_allowed": self.is_live_send_allowed(),
            "message": (
                "WhatsApp live sends are active."
                if self.is_live_send_allowed()
                else "WhatsApp dry-run / disabled — messages are logged only."
            ),
        }

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

        body_parameters map to {{1}}, {{2}}, ... in the Meta template body.
        """
        components: list[dict[str, Any]] = []
        if body_parameters:
            components.append(
                {
                    "type": "body",
                    "parameters": [
                        {"type": "text", "text": str(p)[:1024]} for p in body_parameters
                    ],
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
        return self._dispatch(
            kind="template",
            to_e164=to_e164,
            payload=payload,
            preview_text=preview_text or f"template:{template_name}",
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
        payload = {
            "messaging_product": "whatsapp",
            "to": to_e164.lstrip("+"),
            "type": "text",
            "text": {"preview_url": False, "body": body[:4096]},
        }
        return self._dispatch(
            kind="text",
            to_e164=to_e164,
            payload=payload,
            preview_text=body,
        )

    def _dispatch(
        self,
        *,
        kind: str,
        to_e164: str,
        payload: dict[str, Any],
        preview_text: str,
    ) -> dict[str, Any]:
        if not self.is_live_send_allowed():
            logger.info(
                "whatsapp_dry_run kind=%s to=%s preview=%s",
                kind,
                self._mask_phone(to_e164),
                (preview_text or "")[:500],
            )
            return {
                "ok": True,
                "dry_run": True,
                "kind": kind,
                "to": to_e164,
                "preview": preview_text,
            }

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
            logger.exception(
                "whatsapp_send_failed kind=%s to=%s err=%s",
                kind,
                self._mask_phone(to_e164),
                exc,
            )
            return {
                "ok": False,
                "dry_run": False,
                "kind": kind,
                "error": str(exc),
            }

        if resp.status_code >= 400:
            detail = resp.text[:300]
            logger.error(
                "whatsapp_api_error status=%s to=%s detail=%s",
                resp.status_code,
                self._mask_phone(to_e164),
                detail,
            )
            return {
                "ok": False,
                "dry_run": False,
                "kind": kind,
                "status_code": resp.status_code,
                "error": detail,
            }

        data = {}
        try:
            data = resp.json() or {}
        except Exception:
            data = {}
        message_id = None
        try:
            message_id = (data.get("messages") or [{}])[0].get("id")
        except Exception:
            message_id = None
        logger.info(
            "whatsapp_sent kind=%s to=%s message_id=%s",
            kind,
            self._mask_phone(to_e164),
            message_id,
        )
        return {
            "ok": True,
            "dry_run": False,
            "kind": kind,
            "message_id": message_id,
            "response": data,
        }

    @staticmethod
    def _mask_phone(phone: str) -> str:
        digits = "".join(c for c in (phone or "") if c.isdigit())
        if len(digits) < 4:
            return "***"
        return f"+***{digits[-4:]}"
