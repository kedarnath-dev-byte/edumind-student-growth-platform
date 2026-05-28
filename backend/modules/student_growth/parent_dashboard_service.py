"""Parent dashboard student growth summary metrics."""

from collections import defaultdict
from datetime import datetime
from typing import Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session

from modules.student_growth.habit_service import HabitService
from modules.student_growth.models import (
    LearningLog,
    PeerHelpOffer,
    PeerHelpRequest,
    PeerHelpSession,
    RevisionAttempt,
    RevisionTask,
)


class ParentDashboardService:
    """Builds emotionally safe growth summaries for parents."""

    SUPPORT_SUGGESTIONS = [
        "Ask your child what they understood today, not only whether homework is done.",
        "Encourage Memory Rescue without scolding.",
        "Celebrate honest confusion as the start of real learning.",
        "Notice consistency and effort before marks.",
    ]

    def __init__(self, db: Session):
        self.db = db

    def get_student_summary(
        self,
        student_id: int,
        school_id: Optional[int] = None,
        classroom_id: Optional[int] = None,
        subject_id: Optional[int] = None,
    ) -> dict:
        learning_logs = self._filtered_learning_logs(
            student_id,
            school_id,
            classroom_id,
            subject_id,
        ).order_by(LearningLog.created_at.desc()).all()
        learning_log_ids = [log.id for log in learning_logs]
        confusion_logs = [
            log for log in learning_logs if (log.not_understood or "").strip()
        ]

        return {
            "student_id": student_id,
            "message": "Parent growth summary for your child.",
            "learning_logs_count": len(learning_logs),
            "latest_learning_logs": [
                self._serialize_learning_log(log) for log in learning_logs[:5]
            ],
            "honest_confusion_count": len(confusion_logs),
            "revision_summary": self._revision_summary(
                student_id,
                learning_log_ids,
                filters_active=any(
                    value is not None for value in [school_id, classroom_id, subject_id]
                ),
            ),
            "habit_summary": self._habit_summary(student_id),
            "peer_learning_summary": self._peer_learning_summary(
                student_id,
                school_id,
                classroom_id,
                subject_id,
            ),
            "topics_needing_support": self._topics_needing_support(confusion_logs),
            "parent_support_suggestions": self.SUPPORT_SUGGESTIONS,
        }

    def _filtered_learning_logs(
        self,
        student_id: int,
        school_id: Optional[int],
        classroom_id: Optional[int],
        subject_id: Optional[int],
    ):
        query = self.db.query(LearningLog).filter(LearningLog.student_id == student_id)
        if school_id is not None:
            query = query.filter(LearningLog.school_id == school_id)
        if classroom_id is not None:
            query = query.filter(LearningLog.classroom_id == classroom_id)
        if subject_id is not None:
            query = query.filter(LearningLog.subject_id == subject_id)
        return query

    def _serialize_learning_log(self, log: LearningLog) -> dict:
        return {
            "id": log.id,
            "topic_id": log.topic_id,
            "taught_today": log.taught_today,
            "understood": log.understood,
            "not_understood": log.not_understood,
            "confidence_level": log.confidence_level,
            "created_at": log.created_at,
        }

    def _revision_summary(
        self,
        student_id: int,
        learning_log_ids: list[int],
        filters_active: bool,
    ) -> dict:
        today = datetime.utcnow().date()
        task_query = self.db.query(RevisionTask).filter(
            RevisionTask.student_id == student_id
        )
        attempt_query = self.db.query(RevisionAttempt).filter(
            RevisionAttempt.student_id == student_id
        )

        if filters_active:
            if not learning_log_ids:
                return {
                    "pending_revisions_count": 0,
                    "overdue_revisions_count": 0,
                    "completed_revisions_count": 0,
                    "on_time_revision_completed_count": 0,
                    "memory_rescue_completed_count": 0,
                }
            task_query = task_query.filter(RevisionTask.learning_log_id.in_(learning_log_ids))
            attempt_query = attempt_query.filter(
                RevisionAttempt.learning_log_id.in_(learning_log_ids)
            )

        pending_tasks = task_query.filter(RevisionTask.status == "PENDING").all()
        return {
            "pending_revisions_count": len(pending_tasks),
            "overdue_revisions_count": sum(
                1 for task in pending_tasks if task.due_at.date() < today
            ),
            "completed_revisions_count": task_query.filter(
                RevisionTask.status == "COMPLETED"
            ).count(),
            "on_time_revision_completed_count": attempt_query.filter(
                RevisionAttempt.completed_on_due_date.is_(True)
            ).count(),
            "memory_rescue_completed_count": attempt_query.filter(
                RevisionAttempt.days_late > 0
            ).count(),
        }

    def _habit_summary(self, student_id: int) -> dict:
        summary = HabitService(self.db).get_student_habit_summary(student_id)
        return {
            "daily_learning_logs_count": summary["daily_learning_logs_count"],
            "honest_confusion_count": summary["honest_confusion_count"],
            "revision_completed_count": summary["revision_completed_count"],
            "memory_rescue_completed_count": summary["memory_rescue_completed_count"],
            "total_reward_points": summary["total_reward_points"],
            "today_habit_status": summary["today_habit_status"],
        }

    def _peer_learning_summary(
        self,
        student_id: int,
        school_id: Optional[int],
        classroom_id: Optional[int],
        subject_id: Optional[int],
    ) -> dict:
        request_query = self.db.query(PeerHelpRequest).filter(
            PeerHelpRequest.requester_student_id == student_id
        )
        offer_query = self.db.query(PeerHelpOffer).filter(
            PeerHelpOffer.helper_student_id == student_id
        )
        requester_session_query = self.db.query(PeerHelpSession).filter(
            PeerHelpSession.requester_student_id == student_id
        )
        helper_session_query = self.db.query(PeerHelpSession).filter(
            PeerHelpSession.helper_student_id == student_id
        )
        completed_session_query = self.db.query(PeerHelpSession).filter(
            PeerHelpSession.status == "COMPLETED",
            or_(
                PeerHelpSession.requester_student_id == student_id,
                PeerHelpSession.helper_student_id == student_id,
            ),
        )

        request_query = self._apply_peer_filters(
            request_query, PeerHelpRequest, school_id, classroom_id, subject_id
        )
        offer_query = self._apply_peer_filters(
            offer_query, PeerHelpOffer, school_id, classroom_id, subject_id
        )
        requester_session_query = self._apply_peer_filters(
            requester_session_query,
            PeerHelpSession,
            school_id,
            classroom_id,
            subject_id,
        )
        helper_session_query = self._apply_peer_filters(
            helper_session_query,
            PeerHelpSession,
            school_id,
            classroom_id,
            subject_id,
        )
        completed_session_query = self._apply_peer_filters(
            completed_session_query,
            PeerHelpSession,
            school_id,
            classroom_id,
            subject_id,
        )

        return {
            "help_requests_created_count": request_query.count(),
            "help_offers_created_count": offer_query.count(),
            "peer_sessions_as_requester_count": requester_session_query.count(),
            "peer_sessions_as_helper_count": helper_session_query.count(),
            "peer_sessions_completed_count": completed_session_query.count(),
        }

    def _apply_peer_filters(
        self,
        query,
        model,
        school_id: Optional[int],
        classroom_id: Optional[int],
        subject_id: Optional[int],
    ):
        if school_id is not None:
            query = query.filter(model.school_id == school_id)
        if classroom_id is not None:
            query = query.filter(model.classroom_id == classroom_id)
        if subject_id is not None:
            query = query.filter(model.subject_id == subject_id)
        return query

    def _topics_needing_support(self, confusion_logs: list[LearningLog]) -> list[dict]:
        topic_groups = defaultdict(list)
        for log in confusion_logs:
            if log.topic_id is not None:
                topic_groups[log.topic_id].append(log)

        summaries = []
        for topic_id, logs in topic_groups.items():
            latest_logs = sorted(logs, key=lambda item: item.created_at, reverse=True)
            summaries.append(
                {
                    "topic_id": topic_id,
                    "not_understood_count": len(logs),
                    "latest_confusion_examples": [
                        log.not_understood for log in latest_logs[:3]
                    ],
                }
            )

        return sorted(
            summaries,
            key=lambda item: item["not_understood_count"],
            reverse=True,
        )[:5]
