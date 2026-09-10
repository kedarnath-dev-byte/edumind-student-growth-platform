"""Schemas for subject-world social feed."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class SubjectPostCreate(BaseModel):
    subject_id: int
    caption: Optional[str] = None
    media_url: Optional[str] = None
    media_type: Literal["text", "image", "video"] = "text"
    topic_id: Optional[int] = None
    drive_upload_id: Optional[int] = None


class SubjectPostResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    author_student_id: int
    author_display_name: Optional[str] = None
    school_id: int
    subject_id: int
    topic_id: Optional[int] = None
    caption: Optional[str] = None
    media_url: Optional[str] = None
    media_type: str
    drive_upload_id: Optional[int] = None
    status: str
    like_count: int = 0
    created_at: datetime
    from_followed: bool = False
    score: float = 0


class SubjectFollowCreate(BaseModel):
    following_student_id: int
    subject_id: int


class SubjectFollowResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    follower_student_id: int
    following_student_id: int
    subject_id: int
    created_at: datetime


class SubjectProfileResponse(BaseModel):
    student_id: int
    display_name: str
    school_id: Optional[int] = None
    classroom_id: Optional[int] = None
    subject_id: int
    is_following: bool = False
    follower_count: int = 0
    following_count: int = 0
    post_count: int = 0
    posts: list[SubjectPostResponse] = Field(default_factory=list)
