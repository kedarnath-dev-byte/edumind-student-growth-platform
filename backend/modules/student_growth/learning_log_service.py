"""Business logic for student daily learning logs."""

from typing import List
import hashlib
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError

from sqlalchemy.orm import Session

from modules.student_growth.models import LearningLog, RevisionTask, RewardEvent, LearningSubmission
from modules.student_growth.revision_schedule_factory import RevisionScheduleFactory
from modules.student_growth.schemas import LearningLogCreate


class LearningLogService:
    """Creates learning logs, revision tasks, and healthy rewards."""

    DAILY_LOG_POINTS = 10
    HONEST_CONFUSION_POINTS = 5

    def __init__(self, db: Session):
        self.db = db

    def create_learning_log(self, payload: LearningLogCreate, request_key=None) -> dict:
        digest = hashlib.sha256(payload.model_dump_json().encode()).hexdigest()
        def existing_result():
            receipt = self.db.get(LearningSubmission, (payload.student_id, request_key))
            if receipt is None:
                return None
            if receipt.payload_hash != digest:
                raise HTTPException(409, "This submission key was already used for different content.")
            log = self.db.get(LearningLog, receipt.learning_log_id)
            return {
                "learning_log": log,
                "revision_tasks": self.db.query(RevisionTask).filter_by(learning_log_id=log.id).all(),
                "rewards": self.db.query(RewardEvent).filter_by(learning_log_id=log.id, revision_task_id=None).all(),
            }
        if request_key:
            result = existing_result()
            if result:
                return result
        try:
            learning_log = LearningLog(**payload.model_dump())
            self.db.add(learning_log)
            self.db.flush()
            revision_tasks = self._create_revision_tasks(learning_log)
            rewards = self._create_learning_log_rewards(learning_log)
            if request_key:
                self.db.add(LearningSubmission(student_id=payload.student_id,
                    request_key=request_key, payload_hash=digest, learning_log_id=learning_log.id))
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            if request_key:
                result = existing_result()
                if result:
                    return result
            raise
        except Exception:
            self.db.rollback()
            raise
        return {"learning_log": learning_log, "revision_tasks": revision_tasks, "rewards": rewards}

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
