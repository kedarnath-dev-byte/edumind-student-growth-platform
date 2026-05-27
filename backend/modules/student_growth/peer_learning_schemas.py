"""Schemas for the Peer Learning Circle APIs."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class PeerHelpRequestCreate(BaseModel):
    requester_student_id: int
    school_id: int
    classroom_id: int
    subject_id: int
    topic_id: int
    learning_log_id: Optional[int] = None
    message: str = Field(..., min_length=1)


class PeerHelpRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    requester_student_id: int
    school_id: int
    classroom_id: int
    subject_id: int
    topic_id: int
    learning_log_id: Optional[int] = None
    message: str
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None


class PeerHelpOfferCreate(BaseModel):
    helper_student_id: int
    school_id: int
    classroom_id: int
    subject_id: int
    topic_id: int
    message: str = Field(..., min_length=1)


class PeerHelpOfferResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    helper_student_id: int
    school_id: int
    classroom_id: int
    subject_id: int
    topic_id: int
    message: str
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None


class AcceptHelpRequestRequest(BaseModel):
    helper_student_id: int
    help_offer_id: Optional[int] = None


class CompletePeerHelpSessionRequest(BaseModel):
    requester_feedback: Optional[str] = None
    helper_reflection: Optional[str] = None


class PeerHelpSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    help_request_id: int
    help_offer_id: Optional[int] = None
    requester_student_id: int
    helper_student_id: int
    school_id: int
    classroom_id: int
    subject_id: int
    topic_id: int
    status: str
    requester_feedback: Optional[str] = None
    helper_reflection: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None


class TopicSupportCircleResponse(BaseModel):
    topic_id: int
    open_requests_count: int
    available_helpers_count: int
    open_requests: List[PeerHelpRequestResponse]
    available_offers: List[PeerHelpOfferResponse]
