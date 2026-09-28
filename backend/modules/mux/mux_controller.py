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
from modules.student_growth.product_events import (
    MUX_ATTACH_FAIL,
    MUX_ATTACH_OK,
    record_product_event,
)

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
    try:
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
        record_product_event(
            MUX_ATTACH_OK,
            entity_type=body.target,
            entity_id=body.learning_log_id or body.subject_post_id,
            payload={"target": body.target, "upload_id": body.upload_id},
        )
        return MuxAttachResponse(**result)
    except Exception as exc:
        detail = getattr(exc, "detail", None) or str(exc)
        record_product_event(
            MUX_ATTACH_FAIL,
            entity_type=body.target,
            entity_id=body.learning_log_id or body.subject_post_id,
            payload={"target": body.target, "error": str(detail)[:300]},
        )
        raise


@router.post("/webhooks")
async def mux_webhooks(request: Request):
    """
    Mux webhook receiver (readiness stub).

    Wire Mux dashboard → POST /api/v1/mux/webhooks for video.asset.ready.
    Signature verification (MUX_WEBHOOK_SECRET) is not enforced yet — safe for
    trial wiring. Duration policy still via GET /api/v1/mux/uploads/{id}.
    Orphan GC remains a follow-up once asset inventory is durable.
    See docs/MUX_SHORTS_PIPELINE.md.
    """
    payload = None
    try:
        payload = await request.json()
    except Exception:
        payload = None

    event_type = None
    asset_id = None
    if isinstance(payload, dict):
        event_type = payload.get("type") or payload.get("event")
        data = payload.get("data") if isinstance(payload.get("data"), dict) else {}
        asset_id = data.get("id") or payload.get("id")
        # Record readiness signal for funnel / future attach reconcile.
        if event_type and "video.asset" in str(event_type):
            try:
                from modules.student_growth.product_events import record_product_event

                record_product_event(
                    "mux_webhook_received",
                    entity_type="mux_asset",
                    entity_id=asset_id,
                    payload={"type": str(event_type)[:120]},
                )
            except Exception:
                pass

    return {
        "ok": True,
        "deferred": event_type not in ("video.asset.ready", "video.asset.created"),
        "type": event_type,
        "asset_id": asset_id,
        "message": (
            "Mux webhook acknowledged. Full duration enforcement + orphan GC "
            "remain poll-based until webhook secret verification is enabled."
        ),
    }
