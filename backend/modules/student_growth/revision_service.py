"""Business logic for revision tasks and reward events."""

from datetime import datetime
from typing import List, Optional

from sqlalchemy.orm import Session

from modules.student_growth.models import RevisionTask, RewardEvent


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
    ) -> dict:
        task = (
            self.db.query(RevisionTask)
            .filter(RevisionTask.id == revision_task_id)
            .first()
        )
        if task is None:
            raise ValueError("Revision task not found")

        task.status = "COMPLETED"
        task.completed_at = datetime.utcnow()
        if difficulty_after_revision:
            task.difficulty_after_revision = difficulty_after_revision

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
        self.db.refresh(reward)

        return {"revision_task": task, "reward": reward}

    def list_rewards_for_student(self, student_id: int) -> List[RewardEvent]:
        return (
            self.db.query(RewardEvent)
            .filter(RewardEvent.student_id == student_id)
            .order_by(RewardEvent.created_at.desc())
            .all()
        )
