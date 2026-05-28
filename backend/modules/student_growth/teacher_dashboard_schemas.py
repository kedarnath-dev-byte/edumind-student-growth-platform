"""Schemas for teacher dashboard summaries."""

from typing import List

from pydantic import BaseModel


class TopicSupportSummary(BaseModel):
    topic_id: int
    not_understood_count: int
    latest_confusion_examples: List[str]


class StudentSupportSummary(BaseModel):
    student_id: int
    open_confusions_count: int
    pending_revisions_count: int
    overdue_revisions_count: int


class TeacherClassroomSummaryResponse(BaseModel):
    classroom_id: int
    message: str
    learning_logs_count: int
    students_with_learning_logs_count: int
    honest_confusion_count: int
    pending_revisions_count: int
    overdue_revisions_count: int
    completed_revisions_count: int
    peer_help_open_requests_count: int
    peer_help_completed_sessions_count: int
    topics_needing_support: List[TopicSupportSummary]
    students_needing_support: List[StudentSupportSummary]
    supportive_teacher_actions: List[str]
