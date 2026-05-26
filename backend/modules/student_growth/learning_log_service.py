"""Business logic for student daily learning logs."""

from typing import List

from sqlalchemy.orm import Session

from modules.student_growth.models import LearningLog, RevisionTask, RewardEvent
from modules.student_growth.revision_schedule_factory import RevisionScheduleFactory
from modules.student_growth.schemas import LearningLogCreate


class LearningLogService:
    """Creates learning logs, revision tasks, and healthy rewards."""

    DAILY_LOG_POINTS = 10
    HONEST_CONFUSION_POINTS = 5

    def __init__(self, db: Session):
        self.db = db

    def create_learning_log(self, payload: LearningLogCreate) -> dict:
        learning_log = LearningLog(**payload.model_dump())
        self.db.add(learning_log)
        self.db.commit()
        self.db.refresh(learning_log)

        revision_tasks = self._create_revision_tasks(learning_log)
        rewards = self._create_learning_log_rewards(learning_log)

        self.db.commit()
        for task in revision_tasks:
            self.db.refresh(task)
        for reward in rewards:
            self.db.refresh(reward)

        return {
            "learning_log": learning_log,
            "revision_tasks": revision_tasks,
            "rewards": rewards,
        }

    def get_learning_logs_for_student(self, student_id: int) -> List[LearningLog]:
        return (
            self.db.query(LearningLog)
            .filter(LearningLog.student_id == student_id)
            .order_by(LearningLog.created_at.desc())
            .all()
        )

    def _create_revision_tasks(self, learning_log: LearningLog) -> List[RevisionTask]:
        tasks = []
        for stage, due_at in RevisionScheduleFactory.create_schedule(learning_log.created_at):
            task = RevisionTask(
                learning_log_id=learning_log.id,
                student_id=learning_log.student_id,
                revision_stage=stage,
                due_at=due_at,
                status="PENDING",
            )
            self.db.add(task)
            tasks.append(task)
        return tasks

    def _create_learning_log_rewards(self, learning_log: LearningLog) -> List[RewardEvent]:
        rewards = [
            RewardEvent(
                student_id=learning_log.student_id,
                learning_log_id=learning_log.id,
                event_type="DAILY_LEARNING_LOG_SUBMITTED",
                points=self.DAILY_LOG_POINTS,
                message="Daily learning log submitted. Consistency builds memory.",
            )
        ]

        if (learning_log.not_understood or "").strip():
            rewards.append(
                RewardEvent(
                    student_id=learning_log.student_id,
                    learning_log_id=learning_log.id,
                    event_type="HONEST_CONFUSION_SHARED",
                    points=self.HONEST_CONFUSION_POINTS,
                    message="Great honesty. Now we know what to improve.",
                )
            )

        for reward in rewards:
            self.db.add(reward)
        return rewards
