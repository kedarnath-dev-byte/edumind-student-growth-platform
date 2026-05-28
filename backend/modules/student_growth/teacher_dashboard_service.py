"""Teacher dashboard classroom summary metrics."""

from collections import defaultdict
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from modules.student_growth.models import (
    LearningLog,
    PeerHelpRequest,
    PeerHelpSession,
    RevisionTask,
)


class TeacherDashboardService:
    """Builds class-level learning signals for teacher support."""

    SUPPORTIVE_ACTIONS = [
        "Review topics with repeated confusion.",
        "Encourage peer explanations for students ready to help.",
        "Support students with overdue revisions through Memory Rescue.",
    ]

    def __init__(self, db: Session):
        self.db = db

    def get_classroom_summary(
        self,
        classroom_id: int,
        school_id: Optional[int] = None,
        subject_id: Optional[int] = None,
    ) -> dict:
        today = datetime.utcnow().date()
        logs_query = self._filtered_learning_logs(classroom_id, school_id, subject_id)
        learning_logs = logs_query.all()
        learning_log_ids = [log.id for log in learning_logs]
        student_ids = sorted({log.student_id for log in learning_logs})

        revision_query = self.db.query(RevisionTask).filter(False)
        if learning_log_ids:
            revision_query = self.db.query(RevisionTask).filter(
                RevisionTask.learning_log_id.in_(learning_log_ids)
            )

        pending_revisions = revision_query.filter(RevisionTask.status == "PENDING").all()
        completed_revisions_count = revision_query.filter(
            RevisionTask.status == "COMPLETED"
        ).count()
        overdue_revisions_count = sum(
            1 for task in pending_revisions if task.due_at.date() < today
        )

        confusion_logs = [
            log for log in learning_logs if (log.not_understood or "").strip()
        ]

        return {
            "classroom_id": classroom_id,
            "message": "Teacher support summary for student growth.",
            "learning_logs_count": len(learning_logs),
            "students_with_learning_logs_count": len(student_ids),
            "honest_confusion_count": len(confusion_logs),
            "pending_revisions_count": len(pending_revisions),
            "overdue_revisions_count": overdue_revisions_count,
            "completed_revisions_count": completed_revisions_count,
            "peer_help_open_requests_count": self._peer_help_open_requests_count(
                classroom_id,
                school_id,
                subject_id,
            ),
            "peer_help_completed_sessions_count": (
                self._peer_help_completed_sessions_count(
                    classroom_id,
                    school_id,
                    subject_id,
                )
            ),
            "topics_needing_support": self._topics_needing_support(confusion_logs),
            "students_needing_support": self._students_needing_support(
                confusion_logs,
                pending_revisions,
                today,
            ),
            "supportive_teacher_actions": self.SUPPORTIVE_ACTIONS,
        }

    def _filtered_learning_logs(
        self,
        classroom_id: int,
        school_id: Optional[int],
        subject_id: Optional[int],
    ):
        query = self.db.query(LearningLog).filter(LearningLog.classroom_id == classroom_id)
        if school_id is not None:
            query = query.filter(LearningLog.school_id == school_id)
        if subject_id is not None:
            query = query.filter(LearningLog.subject_id == subject_id)
        return query

    def _peer_help_open_requests_count(
        self,
        classroom_id: int,
        school_id: Optional[int],
        subject_id: Optional[int],
    ) -> int:
        query = self.db.query(PeerHelpRequest).filter(
            PeerHelpRequest.classroom_id == classroom_id,
            PeerHelpRequest.status == "OPEN",
        )
        if school_id is not None:
            query = query.filter(PeerHelpRequest.school_id == school_id)
        if subject_id is not None:
            query = query.filter(PeerHelpRequest.subject_id == subject_id)
        return query.count()

    def _peer_help_completed_sessions_count(
        self,
        classroom_id: int,
        school_id: Optional[int],
        subject_id: Optional[int],
    ) -> int:
        query = self.db.query(PeerHelpSession).filter(
            PeerHelpSession.classroom_id == classroom_id,
            PeerHelpSession.status == "COMPLETED",
        )
        if school_id is not None:
            query = query.filter(PeerHelpSession.school_id == school_id)
        if subject_id is not None:
            query = query.filter(PeerHelpSession.subject_id == subject_id)
        return query.count()

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

    def _students_needing_support(
        self,
        confusion_logs: list[LearningLog],
        pending_revisions: list[RevisionTask],
        today,
    ) -> list[dict]:
        student_support = defaultdict(
            lambda: {
                "student_id": 0,
                "open_confusions_count": 0,
                "pending_revisions_count": 0,
                "overdue_revisions_count": 0,
            }
        )

        for log in confusion_logs:
            summary = student_support[log.student_id]
            summary["student_id"] = log.student_id
            summary["open_confusions_count"] += 1

        for task in pending_revisions:
            summary = student_support[task.student_id]
            summary["student_id"] = task.student_id
            summary["pending_revisions_count"] += 1
            if task.due_at.date() < today:
                summary["overdue_revisions_count"] += 1

        return sorted(
            student_support.values(),
            key=lambda item: (
                item["overdue_revisions_count"],
                item["open_confusions_count"],
            ),
            reverse=True,
        )[:10]
