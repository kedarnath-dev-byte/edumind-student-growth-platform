"""Google Drive upload + metadata persistence for student proofs/documents."""

from __future__ import annotations

import io
import json
import os
from datetime import datetime
from typing import Any

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from modules.student_growth.auth_profile_service import AuthProfileService
from modules.student_growth.models import DriveUpload

# Primary: images + PDF. Optional short video types with a strict size cap.
IMAGE_PDF_MAX_BYTES = 10 * 1024 * 1024  # 10 MB
VIDEO_MAX_BYTES = 50 * 1024 * 1024  # 50 MB

ALLOWED_IMAGE_PDF_MIME = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/heic",
    "image/heif",
}

ALLOWED_VIDEO_MIME = {
    "video/mp4",
    "video/webm",
    "video/quicktime",
}

CATEGORY_FOLDER_ENV = {
    "proof": "DRIVE_PROOFS_FOLDER_ID",
    "document": "DRIVE_DOCUMENTS_FOLDER_ID",
}

DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive"]


def _env_flag_true(name: str) -> bool:
    return (os.getenv(name) or "").strip().lower() in {"1", "true", "yes", "on"}


def _oauth_configured() -> bool:
    return bool(
        (os.getenv("GOOGLE_OAUTH_CLIENT_ID") or "").strip()
        and (os.getenv("GOOGLE_OAUTH_CLIENT_SECRET") or "").strip()
        and (os.getenv("GOOGLE_OAUTH_REFRESH_TOKEN") or "").strip()
    )


def _service_account_configured() -> bool:
    return bool((os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON") or "").strip())


def _require_drive_enabled() -> None:
    if not _env_flag_true("GOOGLE_DRIVE_ENABLED"):
        raise HTTPException(
            status_code=503,
            detail="Google Drive uploads are disabled (GOOGLE_DRIVE_ENABLED=false).",
        )
    if not (_oauth_configured() or _service_account_configured()):
        raise HTTPException(
            status_code=503,
            detail=(
                "Google Drive is not configured. Set GOOGLE_OAUTH_CLIENT_ID, "
                "GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_OAUTH_REFRESH_TOKEN "
                "(recommended for personal Gmail quota), or GOOGLE_SERVICE_ACCOUNT_JSON "
                "with a Shared Drive."
            ),
        )


def _normalize_category(category: str) -> str:
    value = (category or "").strip().lower()
    if value not in CATEGORY_FOLDER_ENV:
        raise HTTPException(
            status_code=400,
            detail="category must be 'proof' or 'document'",
        )
    return value


def _resolve_folder_id(category: str) -> str:
    env_name = CATEGORY_FOLDER_ENV[category]
    folder_id = (os.getenv(env_name) or "").strip()
    if not folder_id:
        raise HTTPException(
            status_code=503,
            detail=f"Google Drive folder is not configured ({env_name} missing).",
        )
    return folder_id


def _validate_mime_and_size(mime_type: str, size_bytes: int) -> None:
    mime = (mime_type or "").split(";")[0].strip().lower()
    if mime in ALLOWED_IMAGE_PDF_MIME:
        if size_bytes > IMAGE_PDF_MAX_BYTES:
            raise HTTPException(
                status_code=400,
                detail="Images and PDFs must be 10MB or smaller.",
            )
        return
    if mime in ALLOWED_VIDEO_MIME:
        if size_bytes > VIDEO_MAX_BYTES:
            raise HTTPException(
                status_code=400,
                detail="Videos must be 50MB or smaller.",
            )
        return
    raise HTTPException(
        status_code=400,
        detail=(
            "Unsupported file type. Allowed: PDF, images "
            "(jpeg/png/webp/gif/heic), or short video (mp4/webm/mov)."
        ),
    )


def _build_drive_service():
    try:
        from google.oauth2 import service_account
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        from googleapiclient.discovery import build
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail="Google Drive client libraries are not installed.",
        ) from exc

    # Prefer user OAuth (personal Gmail / Workspace user quota).
    if _oauth_configured():
        credentials = Credentials(
            token=None,
            refresh_token=os.getenv("GOOGLE_OAUTH_REFRESH_TOKEN", "").strip(),
            token_uri="https://oauth2.googleapis.com/token",
            client_id=os.getenv("GOOGLE_OAUTH_CLIENT_ID", "").strip(),
            client_secret=os.getenv("GOOGLE_OAUTH_CLIENT_SECRET", "").strip(),
            scopes=DRIVE_SCOPES,
        )
        try:
            credentials.refresh(Request())
        except Exception as exc:
            raise HTTPException(
                status_code=503,
                detail=f"Google OAuth refresh failed: {exc}",
            ) from exc
        return build("drive", "v3", credentials=credentials, cache_discovery=False)

    raw_json = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "").strip()
    try:
        info = json.loads(raw_json)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=503,
            detail="GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON.",
        ) from exc

    credentials = service_account.Credentials.from_service_account_info(
        info,
        scopes=DRIVE_SCOPES,
    )
    return build("drive", "v3", credentials=credentials, cache_discovery=False)


class DriveUploadService:
    """Upload files to Google Drive and persist metadata for the student."""

    def __init__(self, db: Session):
        self.db = db

    def upload_for_current_user(
        self,
        *,
        token_payload: dict[str, Any],
        file: UploadFile,
        category: str,
    ) -> DriveUpload:
        _require_drive_enabled()
        normalized_category = _normalize_category(category)
        folder_id = _resolve_folder_id(normalized_category)

        profile = AuthProfileService(self.db).resolve_current_user(token_payload)
        app_user = profile.get("app_user")
        student_profile = profile.get("student_profile")

        if app_user is None:
            raise HTTPException(status_code=404, detail="EduMind user profile not found")

        role = (getattr(app_user, "role", None) or "").upper()
        if role != "STUDENT":
            raise HTTPException(
                status_code=403,
                detail="Only students can upload proofs and documents to Drive.",
            )
        if student_profile is None:
            raise HTTPException(
                status_code=404,
                detail="Student profile is not linked for this account.",
            )

        content = file.file.read() if hasattr(file, "file") else None
        if content is None:
            # FastAPI UploadFile — prefer async path handled by controller.
            raise HTTPException(status_code=400, detail="Empty upload")

        size_bytes = len(content)
        if size_bytes == 0:
            raise HTTPException(status_code=400, detail="Empty upload")

        mime_type = file.content_type or "application/octet-stream"
        _validate_mime_and_size(mime_type, size_bytes)

        file_name = file.filename or f"upload-{normalized_category}"
        drive_meta = self._upload_to_drive(
            file_name=file_name,
            mime_type=mime_type,
            content=content,
            folder_id=folder_id,
        )

        record = DriveUpload(
            student_profile_id=student_profile.id,
            app_user_id=app_user.id,
            supabase_user_id=token_payload.get("sub") or "",
            category=normalized_category,
            drive_file_id=drive_meta["id"],
            file_name=drive_meta.get("name") or file_name,
            mime_type=drive_meta.get("mimeType") or mime_type,
            size_bytes=int(drive_meta.get("size") or size_bytes),
            web_view_link=drive_meta.get("webViewLink"),
            created_at=datetime.utcnow(),
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    async def upload_for_current_user_async(
        self,
        *,
        token_payload: dict[str, Any],
        file: UploadFile,
        category: str,
    ) -> DriveUpload:
        """Async-friendly wrapper that reads UploadFile bytes first."""
        _require_drive_enabled()
        normalized_category = _normalize_category(category)
        folder_id = _resolve_folder_id(normalized_category)

        profile = AuthProfileService(self.db).resolve_current_user(token_payload)
        app_user = profile.get("app_user")
        student_profile = profile.get("student_profile")

        if app_user is None:
            raise HTTPException(status_code=404, detail="EduMind user profile not found")

        role = (getattr(app_user, "role", None) or "").upper()
        if role != "STUDENT":
            raise HTTPException(
                status_code=403,
                detail="Only students can upload proofs and documents to Drive.",
            )
        if student_profile is None:
            raise HTTPException(
                status_code=404,
                detail="Student profile is not linked for this account.",
            )

        content = await file.read()
        size_bytes = len(content)
        if size_bytes == 0:
            raise HTTPException(status_code=400, detail="Empty upload")

        mime_type = file.content_type or "application/octet-stream"
        _validate_mime_and_size(mime_type, size_bytes)

        file_name = file.filename or f"upload-{normalized_category}"
        drive_meta = self._upload_to_drive(
            file_name=file_name,
            mime_type=mime_type,
            content=content,
            folder_id=folder_id,
        )

        record = DriveUpload(
            student_profile_id=student_profile.id,
            app_user_id=app_user.id,
            supabase_user_id=token_payload.get("sub") or "",
            category=normalized_category,
            drive_file_id=drive_meta["id"],
            file_name=drive_meta.get("name") or file_name,
            mime_type=drive_meta.get("mimeType") or mime_type,
            size_bytes=int(drive_meta.get("size") or size_bytes),
            web_view_link=drive_meta.get("webViewLink"),
            created_at=datetime.utcnow(),
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def list_for_current_user(self, token_payload: dict[str, Any]) -> list[DriveUpload]:
        profile = AuthProfileService(self.db).resolve_current_user(token_payload)
        student_profile = profile.get("student_profile")
        if student_profile is None:
            raise HTTPException(
                status_code=404,
                detail="Student profile is not linked for this account.",
            )
        return (
            self.db.query(DriveUpload)
            .filter(DriveUpload.student_profile_id == student_profile.id)
            .order_by(DriveUpload.created_at.desc())
            .all()
        )

    def _upload_to_drive(
        self,
        *,
        file_name: str,
        mime_type: str,
        content: bytes,
        folder_id: str,
    ) -> dict[str, Any]:
        from googleapiclient.http import MediaIoBaseUpload

        service = _build_drive_service()
        media = MediaIoBaseUpload(
            io.BytesIO(content),
            mimetype=mime_type,
            resumable=True,
        )
        body = {
            "name": file_name,
            "parents": [folder_id],
        }
        try:
            created = (
                service.files()
                .create(
                    body=body,
                    media_body=media,
                    fields="id,name,mimeType,size,webViewLink,webContentLink",
                    supportsAllDrives=True,
                )
                .execute()
            )
        except Exception as exc:
            detail = f"Google Drive upload failed: {exc}"
            msg = str(exc)
            if "storageQuotaExceeded" in msg or "Service Accounts do not have storage quota" in msg:
                detail = (
                    "Google Drive upload failed: service accounts have no storage quota. "
                    "Set GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET / "
                    "GOOGLE_OAUTH_REFRESH_TOKEN on Render (upload as your Gmail), "
                    "or use a Shared Drive with the service account."
                )
            raise HTTPException(status_code=502, detail=detail) from exc

        # Best-effort: anyone-with-link so frontend <img>/<video> uc?export=download
        # and Drive preview embeds can play inline (Instagram/Shorts-style feed).
        file_id = created.get("id")
        if file_id:
            try:
                service.permissions().create(
                    fileId=file_id,
                    body={"type": "anyone", "role": "reader"},
                    supportsAllDrives=True,
                    fields="id",
                ).execute()
            except Exception:
                # Folder ACLs / shared-drive policies may block this; upload still succeeds.
                pass

        return created
