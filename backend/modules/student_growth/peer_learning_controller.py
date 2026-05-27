"""HTTP endpoints for Peer Learning Circle."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from core.database import get_db
from modules.student_growth.peer_learning_schemas import (
    AcceptHelpRequestRequest,
    CompletePeerHelpSessionRequest,
    PeerHelpOfferCreate,
    PeerHelpOfferResponse,
    PeerHelpRequestCreate,
    PeerHelpRequestResponse,
    PeerHelpSessionResponse,
    TopicSupportCircleResponse,
)
from modules.student_growth.peer_learning_service import (
    PeerLearningNotFoundError,
    PeerLearningRuleError,
    PeerLearningService,
)

router = APIRouter(prefix="/api/v1/peer-learning", tags=["Peer Learning Circle"])


@router.post("/requests", response_model=PeerHelpRequestResponse)
async def create_help_request(
    payload: PeerHelpRequestCreate,
    db: Session = Depends(get_db),
):
    return PeerLearningService(db).create_help_request(payload)


@router.get("/requests/open", response_model=list[PeerHelpRequestResponse])
async def list_open_requests(
    school_id: Optional[int] = Query(default=None),
    classroom_id: Optional[int] = Query(default=None),
    subject_id: Optional[int] = Query(default=None),
    topic_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
):
    return PeerLearningService(db).list_open_requests(
        school_id=school_id,
        classroom_id=classroom_id,
        subject_id=subject_id,
        topic_id=topic_id,
    )


@router.post("/offers", response_model=PeerHelpOfferResponse)
async def create_help_offer(
    payload: PeerHelpOfferCreate,
    db: Session = Depends(get_db),
):
    return PeerLearningService(db).create_help_offer(payload)


@router.get("/offers/available", response_model=list[PeerHelpOfferResponse])
async def list_available_offers(
    school_id: Optional[int] = Query(default=None),
    classroom_id: Optional[int] = Query(default=None),
    subject_id: Optional[int] = Query(default=None),
    topic_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
):
    return PeerLearningService(db).list_available_offers(
        school_id=school_id,
        classroom_id=classroom_id,
        subject_id=subject_id,
        topic_id=topic_id,
    )


@router.post(
    "/requests/{help_request_id}/accept",
    response_model=PeerHelpSessionResponse,
)
async def accept_help_request(
    help_request_id: int,
    payload: AcceptHelpRequestRequest,
    db: Session = Depends(get_db),
):
    try:
        return PeerLearningService(db).accept_help_request(
            help_request_id=help_request_id,
            helper_student_id=payload.helper_student_id,
            help_offer_id=payload.help_offer_id,
        )
    except PeerLearningRuleError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PeerLearningNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.patch(
    "/sessions/{session_id}/complete",
    response_model=PeerHelpSessionResponse,
)
async def complete_help_session(
    session_id: int,
    payload: CompletePeerHelpSessionRequest,
    db: Session = Depends(get_db),
):
    try:
        return PeerLearningService(db).complete_session(session_id, payload)
    except PeerLearningRuleError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PeerLearningNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get(
    "/student/{student_id}/sessions",
    response_model=list[PeerHelpSessionResponse],
)
async def list_student_sessions(student_id: int, db: Session = Depends(get_db)):
    return PeerLearningService(db).list_sessions_for_student(student_id)


@router.get(
    "/topic/{topic_id}/circle",
    response_model=TopicSupportCircleResponse,
)
async def get_topic_support_circle(topic_id: int, db: Session = Depends(get_db)):
    return PeerLearningService(db).get_topic_circle(topic_id)
