"""Schemas for Courage Loop APIs (privacy-first)."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


VISIBILITY_VALUES = ("private", "trusted")
STAGE_VALUES = ("vulnerable", "clarifying", "courage", "done")


class CourageLoopCreate(BaseModel):
    student_id: int
    subject_id: Optional[int] = None
    topic_id: Optional[int] = None
    learning_log_id: Optional[int] = None
    fear_type: str = Field(..., min_length=1, max_length=80)
    note: Optional[str] = Field(default=None, max_length=2000)
    # Default private: student + counsellor only. trusted adds optional class teacher.
    visibility: str = Field(default="private")


class CourageLoopAdvanceRequest(BaseModel):
    clarity_path: Optional[str] = Field(default=None, max_length=2000)
    courage_action: Optional[str] = Field(default=None, max_length=2000)


class CourageLoopResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    subject_id: Optional[int] = None
    topic_id: Optional[int] = None
    learning_log_id: Optional[int] = None
    fear_type: str
    note: Optional[str] = None
    visibility: str
    stage: str
    clarity_path: Optional[str] = None
    courage_action: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class CourageLoopAdminItem(BaseModel):
    """Admin/leadership-safe row: aggregates/tags only — never private note text."""

    id: int
    student_id: int
    display_name: Optional[str] = None
    subject_id: Optional[int] = None
    topic_id: Optional[int] = None
    fear_type: str
    visibility: str
    stage: str
    has_note: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None


class FearTypeCount(BaseModel):
    fear_type: str
    count: int


class CourageLoopPulseSummary(BaseModel):
    active_loops: int
    needing_clarity: int
    in_courage: int
    completed: int
    by_fear_type: List[FearTypeCount]
    students_needing_clarity: List[CourageLoopAdminItem]
