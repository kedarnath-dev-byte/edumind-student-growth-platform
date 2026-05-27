"""Habit summary metrics for student growth."""

from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from modules.student_growth.models import (
    LearningLog,
    RewardEvent,
    RevisionAttempt,
    RevisionTask,
)


class HabitService:
    """Builds a psychologically safe summary of successful learning habits."""

    def __init__(self, db: Session):
        self.db = db

    def get_student_habit_summary(self, student_id: int) -> dict:
        today = datetime.utcnow().date()
        today_start = datetime.combine(today, datetime.min.time())
        tomorrow_start = today_start + timedelta(days=1)

        daily_learning_logs_count = (
            self.db.query(LearningLog)
            .filter(LearningLog.student_id == student_id)
            .count()
        )
        honest_confusion_count = (
            self.db.query(LearningLog)
            .filter(
                LearningLog.student_id == student_id,
                LearningLog.not_understood.isnot(None),
                func.trim(LearningLog.not_understood) != "",
            )
            .count()
        )
        revision_completed_count = (
            self.db.query(RevisionTask)
            .filter(
                RevisionTask.student_id == student_id,
                RevisionTask.status == "COMPLETED",
            )
            .count()
        )
        on_time_revision_completed_count = (
            self.db.query(RevisionAttempt)
            .filter(
                RevisionAttempt.student_id == student_id,
                RevisionAttempt.completed_on_due_date.is_(True),
            )
            .count()
        )
        memory_rescue_completed_count = (
            self.db.query(RevisionAttempt)
            .filter(
                RevisionAttempt.student_id == student_id,
                RevisionAttempt.days_late > 0,
            )
            .count()
        )
        total_reward_points = (
            self.db.query(func.coalesce(func.sum(RewardEvent.points), 0))
            .filter(RewardEvent.student_id == student_id)
            .scalar()
        )

        today_due_query = self.db.query(RevisionTask).filter(
            RevisionTask.student_id == student_id,
            RevisionTask.due_at >= today_start,
            RevisionTask.due_at < tomorrow_start,
        )
        today_due_revisions_count = today_due_query.count()
        today_completed_revisions_count = today_due_query.filter(
            RevisionTask.status == "COMPLETED"
        ).count()
        today_pending_revisions_count = today_due_query.filter(
            RevisionTask.status == "PENDING"
        ).count()

        return {
            "student_id": student_id,
            "message": "Success is built through daily habits.",
            "daily_learning_logs_count": daily_learning_logs_count,
            "honest_confusion_count": honest_confusion_count,
            "revision_completed_count": revision_completed_count,
            "on_time_revision_completed_count": on_time_revision_completed_count,
            "memory_rescue_completed_count": memory_rescue_completed_count,
            "total_reward_points": total_reward_points,
            "today_due_revisions_count": today_due_revisions_count,
            "today_completed_revisions_count": today_completed_revisions_count,
            "today_pending_revisions_count": today_pending_revisions_count,
            "today_habit_status": self._today_habit_status(
                today_due_revisions_count,
                today_completed_revisions_count,
                today_pending_revisions_count,
            ),
            "habit_cards": [
                {
                    "name": "Daily Learning Habit",
                    "value": daily_learning_logs_count,
                    "message": "Each learning log builds self-awareness.",
                },
                {
                    "name": "Honest Reflection Habit",
                    "value": honest_confusion_count,
                    "message": "Saying 'I need support' is a successful habit.",
                },
                {
                    "name": "Revision Completion Habit",
                    "value": revision_completed_count,
                    "message": "Revision protects memory.",
                },
                {
                    "name": "Memory Rescue Habit",
                    "value": memory_rescue_completed_count,
                    "message": (
                        "No shame. Recovering missed revision is also growth."
                    ),
                },
            ],
        }

    def _today_habit_status(
        self,
        today_due_revisions_count: int,
        today_completed_revisions_count: int,
        today_pending_revisions_count: int,
    ) -> str:
        if today_due_revisions_count == 0:
            return "NO_REVISION_DUE"
        if today_completed_revisions_count == 0 and today_pending_revisions_count > 0:
            return "NOT_STARTED"
        if today_completed_revisions_count > 0 and today_pending_revisions_count > 0:
            return "IN_PROGRESS"
        if today_due_revisions_count > 0 and today_pending_revisions_count == 0:
            return "DONE"
        return "IN_PROGRESS"
