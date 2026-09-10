"""HTTP endpoints for JWT-protected Google Drive student uploads."""

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from core.auth import get_current_supabase_user
from core.database import get_db
from modules.drive.drive_service import DriveUploadService

router = APIRouter(prefix="/api/v1/drive", tags=["Google Drive"])


def _to_payload(record) -> dict:
    return {
        "id": record.id,
        "category": record.category,
        "drive_file_id": record.drive_file_id,
        "webViewLink": record.web_view_link,
        "name": record.file_name,
        "mime": record.mime_type,
        "size": record.size_bytes,
        "student_profile_id": record.student_profile_id,
        "created_at": record.created_at.isoformat() if record.created_at else None,
    }


@router.post("/upload")
async def upload_to_drive(
    file: UploadFile = File(...),
    category: str = Form(..., description="proof | document"),
    payload: dict = Depends(get_current_supabase_user),
    db: Session = Depends(get_db),
):
    """
    Upload a student proof or document to Google Drive.

    Multipart fields:
    - file: binary upload
    - category: proof | document (maps to DRIVE_PROOFS_FOLDER_ID /
      DRIVE_DOCUMENTS_FOLDER_ID)

    Requires a valid Supabase JWT and a linked STUDENT profile.
    Does not affect /api/v1/ingestion/upload (local RAG).
    """
    record = await DriveUploadService(db).upload_for_current_user_async(
        token_payload=payload,
        file=file,
        category=category,
    )
    return _to_payload(record)


@router.get("/uploads")
async def list_my_drive_uploads(
    payload: dict = Depends(get_current_supabase_user),
    db: Session = Depends(get_db),
):
    """List Drive uploads belonging to the authenticated student."""
    records = DriveUploadService(db).list_for_current_user(payload)
    return [_to_payload(r) for r in records]
