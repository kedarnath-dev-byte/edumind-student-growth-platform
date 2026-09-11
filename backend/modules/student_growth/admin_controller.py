"""ADMIN-only overview endpoints for the Admin Control Center / Student Pulse."""

from datetime import datetime, timedelta
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from core.auth import require_admin_user
from core.database import get_db
from modules.student_growth.models import (
    AppUser,
    ClassroomStudent,
    DriveUpload,
    LearningLog,
    ParentProfile,
    ParentStudentLink,
    PeerHelpOffer,
    PeerHelpRequest,
    PeerHelpSession,
    RevisionTask,
    RewardEvent,
    StudentProfile,
    TeacherClassroom,
    TeacherProfile,
)
from modules.student_growth.peer_learning_schemas import (
    PeerHelpOfferResponse,
    PeerHelpRequestResponse,
    PeerHelpSessionResponse,
)
from modules.student_growth.schemas import (
    LearningLogResponse,
    RevisionTaskResponse,
    RewardEventResponse,
)
from modules.student_growth.user_schemas import (
    ClassroomStudentResponse,
    ParentProfileResponse,
    ParentStudentLinkResponse,
    TeacherClassroomResponse,
    TeacherProfileResponse,
)

router = APIRouter(prefix="/api/v1/admin", tags=["Admin Control Center"])


class RiskFlag(BaseModel):
    code: str
    label: str
    severity: str  # high | medium | low


class StudentOverviewItem(BaseModel):
    id: int
    user_id: int
    display_name: str
    school_id: Optional[int] = None
    classroom_id: Optional[int] = None
    guardian_contact: Optional[str] = None
    app_user_full_name: Optional[str] = None
    app_user_email: Optional[str] = None
    app_user_phone: Optional[str] = None
    learning_log_count: int = 0
    revision_task_count: int = 0
    overdue_revision_count: int = 0
    pending_revision_count: int = 0
    peer_session_count: int = 0
    peer_request_open_count: int = 0
    reward_count: int = 0
    days_since_last_log: Optional[int] = None
    last_log_at: Optional[datetime] = None
    recent_confidence: Optional[str] = None
    recent_not_understood: Optional[str] = None
    risk_score: int = 0
    risk_level: str = "ok"  # critical | high | medium | low | ok
    risk_flags: list[RiskFlag] = Field(default_factory=list)
    suggested_support: list[str] = Field(default_factory=list)


class DriveUploadBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    category: str
    file_name: str
    mime_type: str
    web_view_link: Optional[str] = None
    created_at: datetime


class StudentTimelineResponse(BaseModel):
    student: StudentOverviewItem
    learning_logs: list[LearningLogResponse]
    revision_tasks: list[RevisionTaskResponse]
    rewards: list[RewardEventResponse]
    peer_requests: list[PeerHelpRequestResponse]
    peer_offers: list[PeerHelpOfferResponse]
    peer_sessions: list[PeerHelpSessionResponse]
    uploads: list[DriveUploadBrief]


class PeersOverviewResponse(BaseModel):
    open_requests: list[PeerHelpRequestResponse]
    available_offers: list[PeerHelpOfferResponse]
    recent_sessions: list[PeerHelpSessionResponse]
    open_request_count: int
    available_offer_count: int
    session_count: int


class StruggleThemeItem(BaseModel):
    text: str
    count: int
    subject_id: Optional[int] = None
    topic_id: Optional[int] = None


class CoverageOverviewResponse(BaseModel):
    total_students: int
    students_without_school: int
    students_without_classroom: int
    inactive_7d: int
    inactive_14d: int
    with_overdue_revisions: int
    open_peer_requests: int
    struggle_themes: list[StruggleThemeItem]


def _serialize_learning_log(log: LearningLog) -> LearningLogResponse:
    raw_notes = getattr(log, "note_image_urls", None)
    note_urls = [str(u) for u in raw_notes if str(u).strip()] if isinstance(raw_notes, list) else []
    return LearningLogResponse(
        id=log.id,
        student_id=log.student_id,
        school_id=log.school_id,
        classroom_id=log.classroom_id,
        subject_id=log.subject_id,
        topic_id=log.topic_id,
        taught_today=log.taught_today,
        understood=log.understood,
        not_understood=log.not_understood,
        confidence_level=log.confidence_level,
        explanation_video_url=getattr(log, "explanation_video_url", None),
        note_image_urls=note_urls,
        created_at=log.created_at,
        revision_tasks=[],
        rewards=[],
    )


def _build_risk(
    *,
    profile: StudentProfile,
    overdue: int,
    pending: int,
    days_since_last_log: Optional[int],
    recent_confidence: Optional[str],
    recent_not_understood: Optional[str],
    open_peer_requests: int,
) -> tuple[int, str, list[RiskFlag], list[str]]:
    flags: list[RiskFlag] = []
    support: list[str] = []
    score = 0

    if profile.school_id is None or profile.classroom_id is None:
        flags.append(
            RiskFlag(
                code="unassigned",
                label="Missing school/classroom assignment",
                severity="medium",
            )
        )
        score += 2
        support.append("Assign school and classroom")

    if overdue > 0:
        flags.append(
            RiskFlag(
                code="overdue_revisions",
                label=f"{overdue} overdue revision(s)",
                severity="high",
            )
        )
        score += 4 + min(overdue, 3)
        support.append("Nudge revision completion / teacher follow-up")

    if pending > 3:
        flags.append(
            RiskFlag(
                code="pending_revisions",
                label=f"{pending} pending revision(s)",
                severity="medium",
            )
        )
        score += 2
        support.append("Review revision load")

    if days_since_last_log is None:
        flags.append(
            RiskFlag(
                code="never_logged",
                label="No learning logs yet",
                severity="high",
            )
        )
        score += 4
        support.append("Onboard student to daily learning log")
    elif days_since_last_log >= 14:
        flags.append(
            RiskFlag(
                code="inactive_14d",
                label=f"No learning log in {days_since_last_log} days",
                severity="high",
            )
        )
        score += 4
        support.append("Parent nudge + teacher check-in")
    elif days_since_last_log >= 7:
        flags.append(
            RiskFlag(
                code="inactive_7d",
                label=f"No learning log in {days_since_last_log} days",
                severity="medium",
            )
        )
        score += 3
        support.append("Parent nudge for daily reflection")

    conf = (recent_confidence or "").upper()
    if conf == "LOW":
        flags.append(
            RiskFlag(
                code="low_confidence",
                label="Recent confidence LOW",
                severity="high",
            )
        )
        score += 3
        support.append("Peer help or teacher clarification on recent topic")

    if recent_not_understood and str(recent_not_understood).strip():
        flags.append(
            RiskFlag(
                code="not_understood",
                label="Recent not_understood content",
                severity="medium",
            )
        )
        score += 2
        if "Peer help" not in " ".join(support):
            support.append("Match peer helper or assign teacher support")

    if open_peer_requests > 0:
        flags.append(
            RiskFlag(
                code="open_peer_help",
                label=f"{open_peer_requests} open peer help request(s)",
                severity="medium",
            )
        )
        score += 1
        support.append("Find peer helper for open request")

    if score >= 8:
        level = "critical"
    elif score >= 5:
        level = "high"
    elif score >= 3:
        level = "medium"
    elif score >= 1:
        level = "low"
    else:
        level = "ok"

    # Dedupe support suggestions while preserving order
    seen = set()
    unique_support = []
    for item in support:
        if item not in seen:
            seen.add(item)
            unique_support.append(item)

    return score, level, flags, unique_support


def _student_overview_items(
    db: Session,
    *,
    school_id: Optional[int] = None,
    classroom_id: Optional[int] = None,
    risk_only: bool = False,
) -> list[StudentOverviewItem]:
    now = datetime.utcnow()
    query = db.query(StudentProfile)
    if school_id is not None:
        query = query.filter(StudentProfile.school_id == school_id)
    if classroom_id is not None:
        query = query.filter(StudentProfile.classroom_id == classroom_id)
    profiles = query.order_by(StudentProfile.created_at.desc()).all()
    if not profiles:
        return []

    profile_ids = [p.id for p in profiles]
    user_ids = [p.user_id for p in profiles]
    users = {
        u.id: u for u in db.query(AppUser).filter(AppUser.id.in_(user_ids)).all()
    }

    log_counts = dict(
        db.query(LearningLog.student_id, func.count(LearningLog.id))
        .filter(LearningLog.student_id.in_(profile_ids))
        .group_by(LearningLog.student_id)
        .all()
    )
    last_logs = dict(
        db.query(LearningLog.student_id, func.max(LearningLog.created_at))
        .filter(LearningLog.student_id.in_(profile_ids))
        .group_by(LearningLog.student_id)
        .all()
    )

    # Latest log per student for confidence / not_understood (simple pass)
    recent_by_student: dict[int, LearningLog] = {}
    recent_logs = (
        db.query(LearningLog)
        .filter(LearningLog.student_id.in_(profile_ids))
        .order_by(LearningLog.created_at.desc())
        .all()
    )
    for log in recent_logs:
        if log.student_id not in recent_by_student:
            recent_by_student[log.student_id] = log

    revision_counts = dict(
        db.query(RevisionTask.student_id, func.count(RevisionTask.id))
        .filter(RevisionTask.student_id.in_(profile_ids))
        .group_by(RevisionTask.student_id)
        .all()
    )
    overdue_counts = dict(
        db.query(RevisionTask.student_id, func.count(RevisionTask.id))
        .filter(
            RevisionTask.student_id.in_(profile_ids),
            RevisionTask.status == "PENDING",
            RevisionTask.due_at < now,
        )
        .group_by(RevisionTask.student_id)
        .all()
    )
    pending_counts = dict(
        db.query(RevisionTask.student_id, func.count(RevisionTask.id))
        .filter(
            RevisionTask.student_id.in_(profile_ids),
            RevisionTask.status == "PENDING",
        )
        .group_by(RevisionTask.student_id)
        .all()
    )
    reward_counts = dict(
        db.query(RewardEvent.student_id, func.count(RewardEvent.id))
        .filter(RewardEvent.student_id.in_(profile_ids))
        .group_by(RewardEvent.student_id)
        .all()
    )

    peer_counts: dict[int, int] = {pid: 0 for pid in profile_ids}
    for sid, count in (
        db.query(PeerHelpSession.requester_student_id, func.count(PeerHelpSession.id))
        .filter(PeerHelpSession.requester_student_id.in_(profile_ids))
        .group_by(PeerHelpSession.requester_student_id)
        .all()
    ):
        peer_counts[sid] = peer_counts.get(sid, 0) + int(count)
    for sid, count in (
        db.query(PeerHelpSession.helper_student_id, func.count(PeerHelpSession.id))
        .filter(PeerHelpSession.helper_student_id.in_(profile_ids))
        .group_by(PeerHelpSession.helper_student_id)
        .all()
    ):
        peer_counts[sid] = peer_counts.get(sid, 0) + int(count)

    open_req_counts = dict(
        db.query(PeerHelpRequest.requester_student_id, func.count(PeerHelpRequest.id))
        .filter(
            PeerHelpRequest.requester_student_id.in_(profile_ids),
            PeerHelpRequest.status == "OPEN",
        )
        .group_by(PeerHelpRequest.requester_student_id)
        .all()
    )

    items: list[StudentOverviewItem] = []
    for profile in profiles:
        user = users.get(profile.user_id)
        last_at = last_logs.get(profile.id)
        days_since = None
        if last_at is not None:
            days_since = max(0, (now - last_at).days)
        recent = recent_by_student.get(profile.id)
        overdue = int(overdue_counts.get(profile.id, 0))
        pending = int(pending_counts.get(profile.id, 0))
        open_reqs = int(open_req_counts.get(profile.id, 0))
        conf = getattr(recent, "confidence_level", None) if recent else None
        not_u = getattr(recent, "not_understood", None) if recent else None
        score, level, flags, support = _build_risk(
            profile=profile,
            overdue=overdue,
            pending=pending,
            days_since_last_log=days_since if last_at is not None else None,
            recent_confidence=conf,
            recent_not_understood=not_u,
            open_peer_requests=open_reqs,
        )
        # never logged: days_since_last_log None means never
        if last_at is None:
            score, level, flags, support = _build_risk(
                profile=profile,
                overdue=overdue,
                pending=pending,
                days_since_last_log=None,
                recent_confidence=conf,
                recent_not_understood=not_u,
                open_peer_requests=open_reqs,
            )

        item = StudentOverviewItem(
            id=profile.id,
            user_id=profile.user_id,
            display_name=profile.display_name,
            school_id=profile.school_id,
            classroom_id=profile.classroom_id,
            guardian_contact=profile.guardian_contact,
            app_user_full_name=getattr(user, "full_name", None),
            app_user_email=getattr(user, "email", None),
            app_user_phone=getattr(user, "phone", None),
            learning_log_count=int(log_counts.get(profile.id, 0)),
            revision_task_count=int(revision_counts.get(profile.id, 0)),
            overdue_revision_count=overdue,
            pending_revision_count=pending,
            peer_session_count=int(peer_counts.get(profile.id, 0)),
            peer_request_open_count=open_reqs,
            reward_count=int(reward_counts.get(profile.id, 0)),
            days_since_last_log=days_since,
            last_log_at=last_at,
            recent_confidence=conf,
            recent_not_understood=not_u,
            risk_score=score,
            risk_level=level,
            risk_flags=flags,
            suggested_support=support,
        )
        if risk_only and level == "ok":
            continue
        items.append(item)

    items.sort(key=lambda x: (-x.risk_score, x.display_name.lower()))
    return items


@router.get("/students/overview", response_model=list[StudentOverviewItem])
async def list_students_overview(
    school_id: Optional[int] = Query(default=None),
    classroom_id: Optional[int] = Query(default=None),
    risk_only: bool = Query(default=False),
    db: Session = Depends(get_db),
    _admin: dict = Depends(require_admin_user),
):
    """Student Pulse board: students with explainable risk flags, sorted at-risk first."""
    return _student_overview_items(
        db,
        school_id=school_id,
        classroom_id=classroom_id,
        risk_only=risk_only,
    )


@router.get(
    "/students/{student_profile_id}/timeline",
    response_model=StudentTimelineResponse,
)
async def get_student_timeline(
    student_profile_id: int,
    db: Session = Depends(get_db),
    _admin: dict = Depends(require_admin_user),
):
    profile = (
        db.query(StudentProfile)
        .filter(StudentProfile.id == student_profile_id)
        .first()
    )
    if profile is None:
        raise HTTPException(status_code=404, detail="Student profile not found")

    logs = (
        db.query(LearningLog)
        .filter(LearningLog.student_id == student_profile_id)
        .order_by(LearningLog.created_at.desc())
        .limit(30)
        .all()
    )
    revisions = (
        db.query(RevisionTask)
        .filter(RevisionTask.student_id == student_profile_id)
        .order_by(RevisionTask.due_at.desc())
        .limit(40)
        .all()
    )
    rewards = (
        db.query(RewardEvent)
        .filter(RewardEvent.student_id == student_profile_id)
        .order_by(RewardEvent.created_at.desc())
        .limit(30)
        .all()
    )
    peer_requests = (
        db.query(PeerHelpRequest)
        .filter(PeerHelpRequest.requester_student_id == student_profile_id)
        .order_by(PeerHelpRequest.created_at.desc())
        .limit(20)
        .all()
    )
    peer_offers = (
        db.query(PeerHelpOffer)
        .filter(PeerHelpOffer.helper_student_id == student_profile_id)
        .order_by(PeerHelpOffer.created_at.desc())
        .limit(20)
        .all()
    )
    peer_sessions = (
        db.query(PeerHelpSession)
        .filter(
            or_(
                PeerHelpSession.requester_student_id == student_profile_id,
                PeerHelpSession.helper_student_id == student_profile_id,
            )
        )
        .order_by(PeerHelpSession.created_at.desc())
        .limit(20)
        .all()
    )
    uploads = (
        db.query(DriveUpload)
        .filter(DriveUpload.student_profile_id == student_profile_id)
        .order_by(DriveUpload.created_at.desc())
        .limit(20)
        .all()
    )

    single = [
        s for s in _student_overview_items(db) if s.id == student_profile_id
    ]
    if not single:
        raise HTTPException(status_code=404, detail="Student profile not found")
    student_item = single[0]

    return StudentTimelineResponse(
        student=student_item,
        learning_logs=[_serialize_learning_log(log) for log in logs],
        revision_tasks=[
            RevisionTaskResponse.model_validate(task) for task in revisions
        ],
        rewards=[RewardEventResponse.model_validate(r) for r in rewards],
        peer_requests=peer_requests,
        peer_offers=peer_offers,
        peer_sessions=peer_sessions,
        uploads=uploads,
    )


@router.get("/peers/overview", response_model=PeersOverviewResponse)
async def peers_overview(
    db: Session = Depends(get_db),
    _admin: dict = Depends(require_admin_user),
):
    open_requests = (
        db.query(PeerHelpRequest)
        .filter(PeerHelpRequest.status == "OPEN")
        .order_by(PeerHelpRequest.created_at.desc())
        .all()
    )
    available_offers = (
        db.query(PeerHelpOffer)
        .filter(PeerHelpOffer.status == "AVAILABLE")
        .order_by(PeerHelpOffer.created_at.desc())
        .all()
    )
    recent_sessions = (
        db.query(PeerHelpSession)
        .order_by(PeerHelpSession.created_at.desc())
        .limit(50)
        .all()
    )
    return PeersOverviewResponse(
        open_requests=open_requests,
        available_offers=available_offers,
        recent_sessions=recent_sessions,
        open_request_count=len(open_requests),
        available_offer_count=len(available_offers),
        session_count=db.query(func.count(PeerHelpSession.id)).scalar() or 0,
    )


@router.get("/coverage/overview", response_model=CoverageOverviewResponse)
async def coverage_overview(
    db: Session = Depends(get_db),
    _admin: dict = Depends(require_admin_user),
):
    now = datetime.utcnow()
    students = db.query(StudentProfile).all()
    total = len(students)
    without_school = sum(1 for s in students if s.school_id is None)
    without_classroom = sum(1 for s in students if s.classroom_id is None)

    overview = _student_overview_items(db)
    inactive_7d = sum(
        1
        for s in overview
        if s.days_since_last_log is None or (s.days_since_last_log or 0) >= 7
    )
    inactive_14d = sum(
        1
        for s in overview
        if s.days_since_last_log is None or (s.days_since_last_log or 0) >= 14
    )
    with_overdue = sum(1 for s in overview if s.overdue_revision_count > 0)
    open_peer = (
        db.query(func.count(PeerHelpRequest.id))
        .filter(PeerHelpRequest.status == "OPEN")
        .scalar()
        or 0
    )

    # Cheap struggle themes: normalize not_understood snippets
    theme_map: dict[tuple, int] = {}
    cutoff = now - timedelta(days=30)
    logs = (
        db.query(LearningLog)
        .filter(
            LearningLog.created_at >= cutoff,
            LearningLog.not_understood.isnot(None),
            LearningLog.not_understood != "",
        )
        .all()
    )
    for log in logs:
        text = " ".join(str(log.not_understood).strip().split())
        if not text:
            continue
        key_text = text[:120].lower()
        key = (key_text, log.subject_id, log.topic_id)
        theme_map[key] = theme_map.get(key, 0) + 1

    themes = [
        StruggleThemeItem(text=k[0], count=c, subject_id=k[1], topic_id=k[2])
        for k, c in theme_map.items()
    ]
    themes.sort(key=lambda t: (-t.count, t.text))
    themes = themes[:25]

    return CoverageOverviewResponse(
        total_students=total,
        students_without_school=without_school,
        students_without_classroom=without_classroom,
        inactive_7d=inactive_7d,
        inactive_14d=inactive_14d,
        with_overdue_revisions=with_overdue,
        open_peer_requests=int(open_peer),
        struggle_themes=themes,
    )


# ── Relationship / profile lists (MVP) ───────────────────────────────────────


@router.get("/parent-student-links", response_model=list[ParentStudentLinkResponse])
async def list_parent_student_links(
    db: Session = Depends(get_db),
    _admin: dict = Depends(require_admin_user),
):
    return (
        db.query(ParentStudentLink)
        .order_by(ParentStudentLink.created_at.desc())
        .all()
    )


@router.get("/classroom-students", response_model=list[ClassroomStudentResponse])
async def list_classroom_students(
    db: Session = Depends(get_db),
    _admin: dict = Depends(require_admin_user),
):
    return (
        db.query(ClassroomStudent)
        .order_by(ClassroomStudent.created_at.desc())
        .all()
    )


@router.get("/teacher-classrooms", response_model=list[TeacherClassroomResponse])
async def list_teacher_classrooms_admin(
    db: Session = Depends(get_db),
    _admin: dict = Depends(require_admin_user),
):
    return (
        db.query(TeacherClassroom)
        .order_by(TeacherClassroom.created_at.desc())
        .all()
    )


@router.get("/teacher-profiles", response_model=list[TeacherProfileResponse])
async def list_teacher_profiles(
    db: Session = Depends(get_db),
    _admin: dict = Depends(require_admin_user),
):
    return (
        db.query(TeacherProfile)
        .order_by(TeacherProfile.created_at.desc())
        .all()
    )


@router.get("/parent-profiles", response_model=list[ParentProfileResponse])
async def list_parent_profiles(
    db: Session = Depends(get_db),
    _admin: dict = Depends(require_admin_user),
):
    return (
        db.query(ParentProfile)
        .order_by(ParentProfile.created_at.desc())
        .all()
    )


# Back-compat aliases used by earlier scope
@router.get("/peer-requests", response_model=list[PeerHelpRequestResponse])
async def list_all_peer_requests(
    db: Session = Depends(get_db),
    _admin: dict = Depends(require_admin_user),
):
    return db.query(PeerHelpRequest).order_by(PeerHelpRequest.created_at.desc()).all()


@router.get("/peer-offers", response_model=list[PeerHelpOfferResponse])
async def list_all_peer_offers(
    db: Session = Depends(get_db),
    _admin: dict = Depends(require_admin_user),
):
    return db.query(PeerHelpOffer).order_by(PeerHelpOffer.created_at.desc()).all()


@router.get("/peer-sessions", response_model=list[PeerHelpSessionResponse])
async def list_all_peer_sessions(
    db: Session = Depends(get_db),
    _admin: dict = Depends(require_admin_user),
):
    return db.query(PeerHelpSession).order_by(PeerHelpSession.created_at.desc()).all()


@router.get("/student-profiles", response_model=list[StudentOverviewItem])
async def list_student_profiles_alias(
    school_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    _admin: dict = Depends(require_admin_user),
):
    return _student_overview_items(db, school_id=school_id)
