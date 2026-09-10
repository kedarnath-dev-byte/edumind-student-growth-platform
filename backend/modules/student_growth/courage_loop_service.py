"""Service layer for Courage Loop (vulnerability → clarity → courage)."""

from datetime import datetime
from typing import List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from modules.student_growth.courage_loop_schemas import (
    CourageLoopAdvanceRequest,
    CourageLoopAdminItem,
    CourageLoopCreate,
    CourageLoopPulseSummary,
    FearTypeCount,
    STAGE_VALUES,
    VISIBILITY_VALUES,
)
from modules.student_growth.models import CourageLoop, StudentProfile


class CourageLoopRuleError(Exception):
    """Raised when a stage or visibility rule would be broken."""


class CourageLoopNotFoundError(Exception):
    """Raised when a courage loop cannot be found."""


class CourageLoopService:
    """Owns the calm, private courage journey for a student."""

    STAGE_ORDER = list(STAGE_VALUES)

    def __init__(self, db: Session):
        self.db = db

    def create(self, payload: CourageLoopCreate) -> CourageLoop:
        visibility = (payload.visibility or "private").strip().lower()
        if visibility not in VISIBILITY_VALUES:
            raise CourageLoopRuleError(
                "visibility must be private or trusted (never peer feed)."
            )

        row = CourageLoop(
            student_id=payload.student_id,
            subject_id=payload.subject_id,
            topic_id=payload.topic_id,
            learning_log_id=payload.learning_log_id,
            fear_type=payload.fear_type.strip(),
            note=(payload.note or "").strip() or None,
            visibility=visibility,
            stage="vulnerable",
            created_at=datetime.utcnow(),
        )
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def list_mine(self, student_id: int) -> List[CourageLoop]:
        return (
            self.db.query(CourageLoop)
            .filter(CourageLoop.student_id == student_id)
            .order_by(CourageLoop.created_at.desc())
            .all()
        )

    def advance(
        self,
        loop_id: int,
        student_id: int,
        payload: CourageLoopAdvanceRequest,
    ) -> CourageLoop:
        row = (
            self.db.query(CourageLoop)
            .filter(CourageLoop.id == loop_id, CourageLoop.student_id == student_id)
            .first()
        )
        if row is None:
            raise CourageLoopNotFoundError("Courage loop not found")
        if row.stage == "done":
            return row

        idx = self.STAGE_ORDER.index(row.stage)
        next_stage = self.STAGE_ORDER[idx + 1]

        if next_stage == "clarifying":
            if payload.clarity_path and payload.clarity_path.strip():
                row.clarity_path = payload.clarity_path.strip()
        elif next_stage == "courage":
            clarity = (payload.clarity_path or row.clarity_path or "").strip()
            if not clarity:
                raise CourageLoopRuleError(
                    "Add a clarity path before moving to courage."
                )
            row.clarity_path = clarity
        elif next_stage == "done":
            action = (payload.courage_action or row.courage_action or "").strip()
            if not action:
                raise CourageLoopRuleError(
                    "Name one small courage action before marking done."
                )
            row.courage_action = action
            if payload.clarity_path and payload.clarity_path.strip():
                row.clarity_path = payload.clarity_path.strip()

        if payload.courage_action and payload.courage_action.strip():
            row.courage_action = payload.courage_action.strip()

        row.stage = next_stage
        row.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(row)
        return row

    def admin_pulse_summary(
        self,
        school_id: Optional[int] = None,
    ) -> CourageLoopPulseSummary:
        """Counts/tags only — never returns private note text."""
        query = self.db.query(CourageLoop)
        if school_id is not None:
            student_ids = [
                s.id
                for s in self.db.query(StudentProfile.id)
                .filter(StudentProfile.school_id == school_id)
                .all()
            ]
            query = query.filter(CourageLoop.student_id.in_(student_ids or [-1]))

        rows = query.order_by(CourageLoop.updated_at.desc().nullslast(), CourageLoop.created_at.desc()).all()
        active = [r for r in rows if r.stage != "done"]
        needing = [r for r in rows if r.stage in ("vulnerable", "clarifying")]
        in_courage = [r for r in rows if r.stage == "courage"]
        completed = [r for r in rows if r.stage == "done"]

        fear_counts: dict[str, int] = {}
        for r in rows:
            fear_counts[r.fear_type] = fear_counts.get(r.fear_type, 0) + 1
        by_fear = [
            FearTypeCount(fear_type=k, count=v)
            for k, v in sorted(fear_counts.items(), key=lambda x: (-x[1], x[0]))
        ]

        profile_map = {
            p.id: p.display_name
            for p in self.db.query(StudentProfile)
            .filter(StudentProfile.id.in_([r.student_id for r in needing] or [-1]))
            .all()
        }

        needing_items = [
            CourageLoopAdminItem(
                id=r.id,
                student_id=r.student_id,
                display_name=profile_map.get(r.student_id),
                subject_id=r.subject_id,
                topic_id=r.topic_id,
                fear_type=r.fear_type,
                visibility=r.visibility,
                stage=r.stage,
                has_note=bool(r.note and str(r.note).strip()),
                created_at=r.created_at,
                updated_at=r.updated_at,
            )
            for r in needing[:50]
        ]

        return CourageLoopPulseSummary(
            active_loops=len(active),
            needing_clarity=len(needing),
            in_courage=len(in_courage),
            completed=len(completed),
            by_fear_type=by_fear,
            students_needing_clarity=needing_items,
        )
