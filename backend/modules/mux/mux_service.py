"""
Mux Video API service — direct uploads for student Shorts (30s–180s).

Reads MUX_TOKEN_ID + MUX_TOKEN_SECRET from env. When missing, callers get a
clear "Video uploads coming online" style error (HTTP 503) — never Drive quota.
Duration enforcement runs when the asset is ready (poll status); webhook
handler is stubbed/deferred (see docs/MUX_SHORTS_PIPELINE.md).
"""

from __future__ import annotations

import base64
import os
from typing import Any, Optional

import httpx
from fastapi import HTTPException
from sqlalchemy.orm import Session

from modules.student_growth.auth_profile_service import AuthProfileService
from modules.student_growth.models import LearningLog, Subject, SubjectPost

MUX_API_BASE = "https://api.mux.com/video/v1"
MIN_DURATION_SECONDS = 30
MAX_DURATION_SECONDS = 180
COMING_ONLINE = "Video uploads coming online"


def mux_configured() -> bool:
    return bool(
        (os.getenv("MUX_TOKEN_ID") or "").strip()
        and (os.getenv("MUX_TOKEN_SECRET") or "").strip()
    )


def mux_status_payload() -> dict[str, Any]:
    if mux_configured():
        return {
            "configured": True,
            "message": "Mux video uploads are available.",
            "min_duration_seconds": MIN_DURATION_SECONDS,
            "max_duration_seconds": MAX_DURATION_SECONDS,
        }
    return {
        "configured": False,
        "message": COMING_ONLINE,
        "min_duration_seconds": MIN_DURATION_SECONDS,
        "max_duration_seconds": MAX_DURATION_SECONDS,
    }


def playback_url_for(playback_id: str | None) -> str | None:
    if not playback_id:
        return None
    return f"https://stream.mux.com/{playback_id}.m3u8"


def _auth_header() -> str:
    token_id = (os.getenv("MUX_TOKEN_ID") or "").strip()
    token_secret = (os.getenv("MUX_TOKEN_SECRET") or "").strip()
    if not token_id or not token_secret:
        raise HTTPException(status_code=503, detail=COMING_ONLINE)
    raw = f"{token_id}:{token_secret}".encode("utf-8")
    return "Basic " + base64.b64encode(raw).decode("ascii")


def _require_student(db: Session, token_payload: dict[str, Any]):
    profile = AuthProfileService(db).resolve_current_user(token_payload)
    app_user = profile.get("app_user")
    student_profile = profile.get("student_profile")
    if app_user is None:
        raise HTTPException(status_code=404, detail="EduMind user profile not found")
    role = (getattr(app_user, "role", None) or "").upper()
    if role != "STUDENT":
        raise HTTPException(
            status_code=403,
            detail="Only students can upload Shorts videos.",
        )
    if student_profile is None:
        raise HTTPException(
            status_code=404,
            detail="Student profile is not linked for this account.",
        )
    return profile, student_profile


class MuxService:
    """Create Mux direct uploads, poll asset readiness, attach to posts/logs."""

    def __init__(self, db: Session):
        self.db = db

    def create_direct_upload(
        self,
        token_payload: dict[str, Any],
        *,
        cors_origin: Optional[str] = None,
        purpose: str = "general",
    ) -> dict[str, Any]:
        _require_student(self.db, token_payload)
        origin = (cors_origin or os.getenv("MUX_CORS_ORIGIN") or "*").strip() or "*"
        body = {
            "cors_origin": origin,
            "new_asset_settings": {
                "playback_policy": ["public"],
                "mp4_support": "standard",
            },
            # Passthrough for our own bookkeeping when webhooks land later.
            "passthrough": purpose[:255],
        }
        try:
            with httpx.Client(timeout=30.0) as client:
                resp = client.post(
                    f"{MUX_API_BASE}/uploads",
                    headers={
                        "Authorization": _auth_header(),
                        "Content-Type": "application/json",
                    },
                    json=body,
                )
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Could not reach Mux: {exc}",
            ) from exc

        if resp.status_code >= 400:
            detail = COMING_ONLINE
            try:
                detail = resp.json().get("error", {}).get("messages", [detail])[0]
            except Exception:
                detail = resp.text[:200] or detail
            raise HTTPException(status_code=502, detail=f"Mux upload create failed: {detail}")

        data = (resp.json() or {}).get("data") or {}
        upload_id = data.get("id")
        upload_url = data.get("url")
        if not upload_id or not upload_url:
            raise HTTPException(status_code=502, detail="Mux returned an incomplete upload.")
        return {
            "upload_id": upload_id,
            "upload_url": upload_url,
            "timeout_seconds": data.get("timeout"),
            "configured": True,
            "message": "Upload directly to Mux, then poll GET /api/v1/mux/uploads/{upload_id}.",
        }

    def _get_json(self, path: str) -> dict[str, Any]:
        with httpx.Client(timeout=30.0) as client:
            resp = client.get(
                f"{MUX_API_BASE}{path}",
                headers={"Authorization": _auth_header()},
            )
        if resp.status_code >= 400:
            raise HTTPException(
                status_code=502,
                detail=f"Mux API error ({resp.status_code})",
            )
        return resp.json() or {}

    def get_upload_status(
        self,
        token_payload: dict[str, Any],
        upload_id: str,
    ) -> dict[str, Any]:
        _require_student(self.db, token_payload)
        if not (upload_id or "").strip():
            raise HTTPException(status_code=400, detail="upload_id is required")

        upload_payload = self._get_json(f"/uploads/{upload_id.strip()}")
        upload_data = upload_payload.get("data") or {}
        upload_status = upload_data.get("status")
        asset_id = upload_data.get("asset_id")

        playback_id = None
        duration = None
        ready = False
        message = f"Upload status: {upload_status or 'unknown'}"

        if asset_id:
            asset_payload = self._get_json(f"/assets/{asset_id}")
            asset = asset_payload.get("data") or {}
            duration = asset.get("duration")
            playback_ids = asset.get("playback_ids") or []
            if playback_ids:
                playback_id = playback_ids[0].get("id")
            asset_status = asset.get("status")
            ready = asset_status == "ready" and bool(playback_id)
            if asset_status == "ready":
                message = "Asset ready"
            else:
                message = f"Asset status: {asset_status or 'processing'}"

        duration_ok = None
        if duration is not None:
            try:
                d = float(duration)
                duration_ok = MIN_DURATION_SECONDS <= d <= MAX_DURATION_SECONDS
                if ready and duration_ok is False:
                    message = (
                        f"Video must be {MIN_DURATION_SECONDS}–{MAX_DURATION_SECONDS} "
                        f"seconds (got {d:.1f}s). Re-record a Shorts-length clip."
                    )
            except (TypeError, ValueError):
                duration_ok = None

        return {
            "upload_id": upload_id,
            "upload_status": upload_status,
            "asset_id": asset_id,
            "playback_id": playback_id,
            "playback_url": playback_url_for(playback_id),
            "duration_seconds": float(duration) if duration is not None else None,
            "duration_ok": duration_ok,
            "ready": bool(ready and duration_ok is not False),
            "message": message,
        }

    def attach(
        self,
        token_payload: dict[str, Any],
        *,
        upload_id: Optional[str] = None,
        asset_id: Optional[str] = None,
        playback_id: Optional[str] = None,
        duration_seconds: Optional[float] = None,
        target: str = "learning_log",
        learning_log_id: Optional[int] = None,
        subject_post_id: Optional[int] = None,
        subject_id: Optional[int] = None,
        caption: Optional[str] = None,
        topic_id: Optional[int] = None,
    ) -> dict[str, Any]:
        _, student = _require_student(self.db, token_payload)

        # Prefer live Mux status when upload_id is present.
        status: dict[str, Any] = {}
        if upload_id:
            status = self.get_upload_status(token_payload, upload_id)
            asset_id = status.get("asset_id") or asset_id
            playback_id = status.get("playback_id") or playback_id
            duration_seconds = status.get("duration_seconds") if status.get("duration_seconds") is not None else duration_seconds
            if status.get("duration_ok") is False:
                raise HTTPException(status_code=400, detail=status.get("message") or "Duration out of range")
            if not status.get("ready"):
                raise HTTPException(
                    status_code=409,
                    detail=status.get("message") or "Mux asset not ready yet — keep polling.",
                )

        if not playback_id or not asset_id:
            raise HTTPException(
                status_code=400,
                detail="playback_id and asset_id are required (poll upload until ready).",
            )

        if duration_seconds is not None:
            d = float(duration_seconds)
            if d < MIN_DURATION_SECONDS or d > MAX_DURATION_SECONDS:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Video must be {MIN_DURATION_SECONDS}–{MAX_DURATION_SECONDS} "
                        f"seconds (got {d:.1f}s)."
                    ),
                )

        play_url = playback_url_for(playback_id)

        if target == "learning_log":
            if not learning_log_id:
                raise HTTPException(status_code=400, detail="learning_log_id is required")
            log = (
                self.db.query(LearningLog)
                .filter(
                    LearningLog.id == learning_log_id,
                    LearningLog.student_id == student.id,
                )
                .first()
            )
            if log is None:
                raise HTTPException(status_code=404, detail="Learning log not found")
            log.explanation_video_url = play_url
            log.mux_asset_id = asset_id
            log.mux_playback_id = playback_id
            log.mux_upload_id = upload_id
            if duration_seconds is not None:
                log.video_duration_seconds = float(duration_seconds)
            self.db.commit()
            return {
                "ok": True,
                "message": "Mux video attached to learning log",
                "playback_id": playback_id,
                "playback_url": play_url,
                "asset_id": asset_id,
                "duration_seconds": duration_seconds,
                "learning_log_id": log.id,
                "subject_post_id": None,
            }

        # subject_post
        if subject_post_id:
            post = (
                self.db.query(SubjectPost)
                .filter(
                    SubjectPost.id == subject_post_id,
                    SubjectPost.author_student_id == student.id,
                )
                .first()
            )
            if post is None:
                raise HTTPException(status_code=404, detail="Subject post not found")
            post.media_url = play_url
            post.media_type = "video"
            post.mux_asset_id = asset_id
            post.mux_playback_id = playback_id
            post.mux_upload_id = upload_id
            if duration_seconds is not None:
                post.video_duration_seconds = float(duration_seconds)
            self.db.commit()
            return {
                "ok": True,
                "message": "Mux video attached to subject post",
                "playback_id": playback_id,
                "playback_url": play_url,
                "asset_id": asset_id,
                "duration_seconds": duration_seconds,
                "learning_log_id": None,
                "subject_post_id": post.id,
            }

        if not subject_id:
            raise HTTPException(
                status_code=400,
                detail="Provide subject_post_id or subject_id to create a video post.",
            )
        subject = (
            self.db.query(Subject)
            .filter(Subject.id == subject_id, Subject.school_id == student.school_id)
            .first()
        )
        if subject is None:
            raise HTTPException(status_code=404, detail="Subject not found for your school.")
        from datetime import datetime

        post = SubjectPost(
            author_student_id=student.id,
            school_id=student.school_id,
            subject_id=subject_id,
            topic_id=topic_id,
            caption=(caption or "").strip() or None,
            media_url=play_url,
            media_type="video",
            mux_asset_id=asset_id,
            mux_playback_id=playback_id,
            mux_upload_id=upload_id,
            video_duration_seconds=float(duration_seconds) if duration_seconds is not None else None,
            status="ACTIVE",
            like_count=0,
            created_at=datetime.utcnow(),
        )
        self.db.add(post)
        self.db.commit()
        self.db.refresh(post)
        return {
            "ok": True,
            "message": "Subject Shorts post created with Mux video",
            "playback_id": playback_id,
            "playback_url": play_url,
            "asset_id": asset_id,
            "duration_seconds": duration_seconds,
            "learning_log_id": None,
            "subject_post_id": post.id,
        }
