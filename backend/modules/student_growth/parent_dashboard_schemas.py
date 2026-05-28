"""Schemas for parent dashboard summaries."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class ParentLearningLogSummary(BaseModel):
    id: int
    topic_id: Optional[int] = None
    taught_today: str
    understood: str
    not_understood: Optional[str] = None
    confidence_level: str
    created_at: datetime


class ParentRevisionSummary(BaseModel):
    pending_revisions_count: int
    overdue_revisions_count: int
    completed_revisions_count: int
    on_time_revision_completed_count: int
    memory_rescue_completed_count: int


class ParentHabitSummary(BaseModel):
    daily_learning_logs_count: int
    honest_confusion_count: int
    revision_completed_count: int
    memory_rescue_completed_count: int
    total_reward_points: int
    today_habit_status: str


class ParentPeerLearningSummary(BaseModel):
    help_requests_created_count: int
    help_offers_created_count: int
    peer_sessions_as_requester_count: int
    peer_sessions_as_helper_count: int
    peer_sessions_completed_count: int


class ParentTopicSupportSummary(BaseModel):
    topic_id: int
    not_understood_count: int
    latest_confusion_examples: List[str]


class ParentStudentSummaryResponse(BaseModel):
    student_id: int
    message: str
    learning_logs_count: int
    latest_learning_logs: List[ParentLearningLogSummary]
    honest_confusion_count: int
    revision_summary: ParentRevisionSummary
    habit_summary: ParentHabitSummary
    peer_learning_summary: ParentPeerLearningSummary
    topics_needing_support: List[ParentTopicSupportSummary]
    parent_support_suggestions: List[str]
