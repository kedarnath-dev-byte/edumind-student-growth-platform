"""Pydantic schemas for Mux Shorts upload pipeline."""

from typing import Literal, Optional

from pydantic import BaseModel, Field


class MuxStatusResponse(BaseModel):
    configured: bool
    message: str
    min_duration_seconds: int = 30
    max_duration_seconds: int = 180


class MuxCreateUploadRequest(BaseModel):
    """Optional cors origin override; defaults to * for mobile PWA."""

    cors_origin: Optional[str] = None
    purpose: Literal["learning_log", "subject_post", "general"] = "general"


class MuxCreateUploadResponse(BaseModel):
    upload_id: str
    upload_url: str
    timeout_seconds: Optional[int] = None
    configured: bool = True
    message: str = "Upload directly to Mux, then poll status."


class MuxUploadStatusResponse(BaseModel):
    upload_id: str
    upload_status: Optional[str] = None
    asset_id: Optional[str] = None
    playback_id: Optional[str] = None
    playback_url: Optional[str] = None
    duration_seconds: Optional[float] = None
    duration_ok: Optional[bool] = None
    ready: bool = False
    message: str = ""


class MuxAttachRequest(BaseModel):
    """Attach a ready Mux asset to Learning Log and/or Subject Post fields."""

    upload_id: Optional[str] = None
    asset_id: Optional[str] = None
    playback_id: Optional[str] = None
    duration_seconds: Optional[float] = None
    target: Literal["learning_log", "subject_post"] = "learning_log"
    learning_log_id: Optional[int] = None
    subject_post_id: Optional[int] = None
    # When creating a new subject post with video:
    subject_id: Optional[int] = None
    caption: Optional[str] = None
    topic_id: Optional[int] = None


class MuxAttachResponse(BaseModel):
    ok: bool
    message: str
    playback_id: Optional[str] = None
    playback_url: Optional[str] = None
    asset_id: Optional[str] = None
    duration_seconds: Optional[float] = None
    learning_log_id: Optional[int] = None
    subject_post_id: Optional[int] = None
