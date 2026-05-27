"""Service layer for Peer Learning Circle."""

from datetime import datetime
from typing import List, Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session

from modules.student_growth.models import (
    PeerHelpOffer,
    PeerHelpRequest,
    PeerHelpSession,
    RewardEvent,
)
from modules.student_growth.peer_learning_schemas import (
    CompletePeerHelpSessionRequest,
    PeerHelpOfferCreate,
    PeerHelpRequestCreate,
)


class PeerLearningRuleError(Exception):
    """Raised when a peer learning action would break a support rule."""


class PeerLearningNotFoundError(Exception):
    """Raised when a peer learning record cannot be found."""


class PeerLearningService:
    """Creates safe peer support requests, offers, and sessions."""

    HELP_RECEIVED_POINTS = 5
    HELP_GIVEN_POINTS = 15

    def __init__(self, db: Session):
        self.db = db

    def create_help_request(self, payload: PeerHelpRequestCreate) -> PeerHelpRequest:
        help_request = PeerHelpRequest(**payload.model_dump(), status="OPEN")
        self.db.add(help_request)
        self.db.commit()
        self.db.refresh(help_request)
        return help_request

    def list_open_requests(
        self,
        school_id: Optional[int] = None,
        classroom_id: Optional[int] = None,
        subject_id: Optional[int] = None,
        topic_id: Optional[int] = None,
    ) -> List[PeerHelpRequest]:
        query = self.db.query(PeerHelpRequest).filter(PeerHelpRequest.status == "OPEN")
        query = self._apply_filters(
            query,
            PeerHelpRequest,
            school_id,
            classroom_id,
            subject_id,
            topic_id,
        )
        return query.order_by(PeerHelpRequest.created_at.desc()).all()

    def create_help_offer(self, payload: PeerHelpOfferCreate) -> PeerHelpOffer:
        help_offer = PeerHelpOffer(**payload.model_dump(), status="AVAILABLE")
        self.db.add(help_offer)
        self.db.commit()
        self.db.refresh(help_offer)
        return help_offer

    def list_available_offers(
        self,
        school_id: Optional[int] = None,
        classroom_id: Optional[int] = None,
        subject_id: Optional[int] = None,
        topic_id: Optional[int] = None,
    ) -> List[PeerHelpOffer]:
        query = self.db.query(PeerHelpOffer).filter(PeerHelpOffer.status == "AVAILABLE")
        query = self._apply_filters(
            query,
            PeerHelpOffer,
            school_id,
            classroom_id,
            subject_id,
            topic_id,
        )
        return query.order_by(PeerHelpOffer.created_at.desc()).all()

    def accept_help_request(
        self,
        help_request_id: int,
        helper_student_id: int,
        help_offer_id: Optional[int] = None,
    ) -> PeerHelpSession:
        help_request = (
            self.db.query(PeerHelpRequest)
            .filter(PeerHelpRequest.id == help_request_id)
            .first()
        )
        if help_request is None:
            raise PeerLearningNotFoundError("Peer help request not found")
        if help_request.status != "OPEN":
            raise PeerLearningRuleError("This support request is not open.")
        if help_request.requester_student_id == helper_student_id:
            raise PeerLearningRuleError(
                "A requester and helper must be different students."
            )

        help_offer = None
        if help_offer_id is not None:
            help_offer = (
                self.db.query(PeerHelpOffer)
                .filter(PeerHelpOffer.id == help_offer_id)
                .first()
            )
            if help_offer is None:
                raise PeerLearningNotFoundError("Peer help offer not found")
            if help_offer.status != "AVAILABLE":
                raise PeerLearningRuleError("This help offer is not available.")
            if help_offer.helper_student_id != helper_student_id:
                raise PeerLearningRuleError(
                    "Help offer must belong to the accepting helper."
                )

        now = datetime.utcnow()
        session = PeerHelpSession(
            help_request_id=help_request.id,
            help_offer_id=help_offer.id if help_offer else None,
            requester_student_id=help_request.requester_student_id,
            helper_student_id=helper_student_id,
            school_id=help_request.school_id,
            classroom_id=help_request.classroom_id,
            subject_id=help_request.subject_id,
            topic_id=help_request.topic_id,
            status="ACTIVE",
        )
        help_request.status = "ACCEPTED"
        help_request.updated_at = now
        if help_offer:
            help_offer.status = "MATCHED"
            help_offer.updated_at = now

        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session

    def complete_session(
        self,
        session_id: int,
        payload: CompletePeerHelpSessionRequest,
    ) -> PeerHelpSession:
        session = (
            self.db.query(PeerHelpSession)
            .filter(PeerHelpSession.id == session_id)
            .first()
        )
        if session is None:
            raise PeerLearningNotFoundError("Peer help session not found")
        if session.status == "COMPLETED":
            return session
        if session.status != "ACTIVE":
            raise PeerLearningRuleError("Only active peer help sessions can be completed.")

        now = datetime.utcnow()
        session.status = "COMPLETED"
        session.requester_feedback = payload.requester_feedback
        session.helper_reflection = payload.helper_reflection
        session.completed_at = now

        help_request = (
            self.db.query(PeerHelpRequest)
            .filter(PeerHelpRequest.id == session.help_request_id)
            .first()
        )
        if help_request:
            help_request.status = "COMPLETED"
            help_request.updated_at = now

        help_offer = None
        if session.help_offer_id:
            help_offer = (
                self.db.query(PeerHelpOffer)
                .filter(PeerHelpOffer.id == session.help_offer_id)
                .first()
            )
            if help_offer:
                help_offer.status = "COMPLETED"
                help_offer.updated_at = now

        self._create_peer_rewards(session)
        self.db.commit()
        self.db.refresh(session)
        return session

    def list_sessions_for_student(self, student_id: int) -> List[PeerHelpSession]:
        return (
            self.db.query(PeerHelpSession)
            .filter(
                or_(
                    PeerHelpSession.requester_student_id == student_id,
                    PeerHelpSession.helper_student_id == student_id,
                )
            )
            .order_by(PeerHelpSession.created_at.desc())
            .all()
        )

    def get_topic_circle(self, topic_id: int) -> dict:
        open_requests = self.list_open_requests(topic_id=topic_id)
        available_offers = self.list_available_offers(topic_id=topic_id)
        return {
            "topic_id": topic_id,
            "open_requests_count": len(open_requests),
            "available_helpers_count": len(available_offers),
            "open_requests": open_requests,
            "available_offers": available_offers,
        }

    def _create_peer_rewards(self, session: PeerHelpSession) -> None:
        self.db.add(
            RewardEvent(
                student_id=session.requester_student_id,
                event_type="PEER_HELP_RECEIVED",
                points=self.HELP_RECEIVED_POINTS,
                message="Peer learning support received. Asking safely is growth.",
            )
        )
        self.db.add(
            RewardEvent(
                student_id=session.helper_student_id,
                event_type="PEER_HELP_GIVEN",
                points=self.HELP_GIVEN_POINTS,
                message="Peer help given. Explaining strengthens your own learning.",
            )
        )

    def _apply_filters(
        self,
        query,
        model,
        school_id: Optional[int],
        classroom_id: Optional[int],
        subject_id: Optional[int],
        topic_id: Optional[int],
    ):
        if school_id is not None:
            query = query.filter(model.school_id == school_id)
        if classroom_id is not None:
            query = query.filter(model.classroom_id == classroom_id)
        if subject_id is not None:
            query = query.filter(model.subject_id == subject_id)
        if topic_id is not None:
            query = query.filter(model.topic_id == topic_id)
        return query
