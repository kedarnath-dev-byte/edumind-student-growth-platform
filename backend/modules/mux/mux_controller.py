"""HTTP endpoints for Mux Shorts direct upload (STUDENT only)."""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from core.auth import get_current_supabase_user
from core.database import get_db
from modules.mux.mux_schemas import (
    MuxAttachRequest,
    MuxAttachResponse,
    MuxCreateUploadRequest,
    MuxCreateUploadResponse,
    MuxStatusResponse,
    MuxUploadStatusResponse,
)
from modules.mux.mux_service import MuxService, mux_status_payload

router = APIRouter(prefix="/api/v1/mux", tags=["Mux Shorts"])


@router.get("/status", response_model=MuxStatusResponse)
async def mux_status():
    """Public-ish readiness probe (no secrets). Safe for UI gates."""
    return MuxStatusResponse(**mux_status_payload())


@router.post("/uploads", response_model=MuxCreateUploadResponse)
async def create_mux_upload(
    body: MuxCreateUploadRequest | None = None,
    payload: dict = Depends(get_current_supabase_user),
    db: Session = Depends(get_db),
):
    """
    Create a Mux direct upload for the authenticated STUDENT.
    Client PUTs the video bytes to upload_url, then polls GET /uploads/{id}.
    Returns 503 with "Video uploads coming online" when Mux env is missing.
    """
    req = body or MuxCreateUploadRequest()
    result = MuxService(db).create_direct_upload(
        payload,
        cors_origin=req.cors_origin,
        purpose=req.purpose,
    )
    return MuxCreateUploadResponse(**result)


@router.get("/uploads/{upload_id}", response_model=MuxUploadStatusResponse)
async def get_mux_upload_status(
    upload_id: str,
    payload: dict = Depends(get_current_supabase_user),
    db: Session = Depends(get_db),
):
    """Poll Mux upload + asset. Enforces 30s–180s when duration is known."""
    result = MuxService(db).get_upload_status(payload, upload_id)
    return MuxUploadStatusResponse(**result)


@router.post("/attach", response_model=MuxAttachResponse)
async def attach_mux_media(
    body: MuxAttachRequest,
    payload: dict = Depends(get_current_supabase_user),
    db: Session = Depends(get_db),
):
    """Attach a ready Mux asset to a learning log or subject post."""
    result = MuxService(db).attach(
        payload,
        upload_id=body.upload_id,
        asset_id=body.asset_id,
        playback_id=body.playback_id,
        duration_seconds=body.duration_seconds,
        target=body.target,
        learning_log_id=body.learning_log_id,
        subject_post_id=body.subject_post_id,
        subject_id=body.subject_id,
        caption=body.caption,
        topic_id=body.topic_id,
    )
    return MuxAttachResponse(**result)


@router.post("/webhooks")
async def mux_webhooks(request: Request):
    """
    Deferred webhook receiver.

    Wire Mux dashboard → POST /api/v1/mux/webhooks for video.asset.ready and
    enforce duration there. Signature verification (MUX_WEBHOOK_SECRET) is not
    enabled yet — this endpoint acknowledges payloads so trial wiring is safe.
    See docs/MUX_SHORTS_PIPELINE.md.
    """
    try:
        _ = await request.json()
    except Exception:
        _ = None
    return {
        "ok": True,
        "deferred": True,
        "message": (
            "Mux webhooks acknowledged but processing is deferred. "
            "Duration is enforced via GET /api/v1/mux/uploads/{id} for now."
        ),
    }
