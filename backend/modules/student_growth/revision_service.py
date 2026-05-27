"""Business logic for revision tasks and reward events."""

from datetime import datetime
from typing import List, Optional

from sqlalchemy.orm import Session

from modules.student_growth.models import RevisionAttempt, RevisionTask, RewardEvent


class FutureRevisionLockedError(Exception):
    """Raised when a student tries to complete a revision before its due date."""


class RevisionService:
    """Lists and completes revision tasks for students."""

    REVISION_COMPLETION_POINTS = 10

    def __init__(self, db: Session):
        self.db = db

    def list_revisions_for_student(self, student_id: int) -> List[RevisionTask]:
        return (
            self.db.query(RevisionTask)
            .filter(RevisionTask.student_id == student_id)
            .order_by(RevisionTask.due_at.asc())
            .all()
        )

    def complete_revision(
        self,
        revision_task_id: int,
        difficulty_after_revision: Optional[str] = None,
        revision_text_summary: Optional[str] = None,
        revision_video_url: Optional[str] = None,
    ) -> dict:
        task = (
            self.db.query(RevisionTask)
            .filter(RevisionTask.id == revision_task_id)
            .first()
        )
        if task is None:
            raise ValueError("Revision task not found")

        existing_attempt = (
            self.db.query(RevisionAttempt)
            .filter(RevisionAttempt.revision_task_id == revision_task_id)
            .first()
        )
        if task.status == "COMPLETED":
            return {
                "revision_task": task,
                "reward": None,
                "attempt": existing_attempt,
                "already_completed": True,
            }

        completed_at = datetime.utcnow()
        if task.due_at.date() > completed_at.date():
            raise FutureRevisionLockedError(
                "Future revision is locked until its due date."
            )

        task.status = "COMPLETED"
        task.completed_at = completed_at
        if difficulty_after_revision:
            task.difficulty_after_revision = difficulty_after_revision

        days_late = max((completed_at.date() - task.due_at.date()).days, 0)
        attempt = RevisionAttempt(
            revision_task_id=task.id,
            student_id=task.student_id,
            learning_log_id=task.learning_log_id,
            attempt_number=1,
            completed_at=completed_at,
            completed_on_due_date=completed_at.date() == task.due_at.date(),
            days_late=days_late,
            difficulty_after_revision=difficulty_after_revision,
            revision_text_summary=revision_text_summary,
            revision_video_url=revision_video_url,
            points_awarded=self.REVISION_COMPLETION_POINTS,
        )
        self.db.add(attempt)

        reward = RewardEvent(
            student_id=task.student_id,
            learning_log_id=task.learning_log_id,
            revision_task_id=task.id,
            event_type="REVISION_COMPLETED",
            points=self.REVISION_COMPLETION_POINTS,
            message="Revision completed. You are strengthening your memory.",
        )
        self.db.add(reward)
        self.db.commit()
        self.db.refresh(task)
        self.db.refresh(attempt)
        self.db.refresh(reward)

        return {"revision_task": task, "reward": reward, "attempt": attempt}

    def list_rewards_for_student(self, student_id: int) -> List[RewardEvent]:
        return (
            self.db.query(RewardEvent)
            .filter(RewardEvent.student_id == student_id)
            .order_by(RewardEvent.created_at.desc())
            .all()
        )

    def list_attempts_for_revision(self, revision_task_id: int) -> List[RevisionAttempt]:
        return (
            self.db.query(RevisionAttempt)
            .filter(RevisionAttempt.revision_task_id == revision_task_id)
            .order_by(RevisionAttempt.completed_at.desc())
            .all()
        )

    def list_attempts_for_student(self, student_id: int) -> List[RevisionAttempt]:
        return (
            self.db.query(RevisionAttempt)
            .filter(RevisionAttempt.student_id == student_id)
            .order_by(RevisionAttempt.completed_at.desc())
            .all()
        )
