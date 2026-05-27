"""Pydantic schemas for Student Growth MVP APIs."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class RevisionTaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    learning_log_id: int
    student_id: int
    revision_stage: str
    due_at: datetime
    status: str
    difficulty_after_revision: Optional[str] = None
    completed_at: Optional[datetime] = None
    created_at: datetime


class RewardEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    learning_log_id: Optional[int] = None
    revision_task_id: Optional[int] = None
    event_type: str
    points: int
    message: str
    created_at: datetime


class LearningLogCreate(BaseModel):
    student_id: int
    school_id: Optional[int] = None
    classroom_id: Optional[int] = None
    subject_id: Optional[int] = None
    topic_id: Optional[int] = None
    taught_today: str = Field(..., min_length=1)
    understood: str = Field(..., min_length=1)
    not_understood: Optional[str] = None
    confidence_level: str = "MEDIUM"


class LearningLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    school_id: Optional[int] = None
    classroom_id: Optional[int] = None
    subject_id: Optional[int] = None
    topic_id: Optional[int] = None
    taught_today: str
    understood: str
    not_understood: Optional[str] = None
    confidence_level: str
    created_at: datetime
    revision_tasks: List[RevisionTaskResponse] = Field(default_factory=list)
    rewards: List[RewardEventResponse] = Field(default_factory=list)


class RevisionCompleteRequest(BaseModel):
    difficulty_after_revision: Optional[str] = None
    revision_text_summary: Optional[str] = None
    revision_video_url: Optional[str] = None


class RevisionAttemptResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    revision_task_id: int
    student_id: int
    learning_log_id: int
    attempt_number: int
    completed_at: datetime
    completed_on_due_date: bool
    days_late: int
    difficulty_after_revision: Optional[str] = None
    revision_text_summary: Optional[str] = None
    revision_video_url: Optional[str] = None
    points_awarded: int
    created_at: datetime


class HabitCardResponse(BaseModel):
    name: str
    value: int
    message: str


class HabitSummaryResponse(BaseModel):
    student_id: int
    message: str
    daily_learning_logs_count: int
    honest_confusion_count: int
    revision_completed_count: int
    on_time_revision_completed_count: int
    memory_rescue_completed_count: int
    total_reward_points: int
    today_due_revisions_count: int
    today_completed_revisions_count: int
    today_pending_revisions_count: int
    today_habit_status: str
    habit_cards: List[HabitCardResponse]
