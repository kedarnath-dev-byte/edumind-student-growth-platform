"""Fail-closed authorization for student growth routes.

Roles and memberships come from the database, never from client metadata.
Unlisted routes require the platform administrator. School staff use TEACHER.
"""
from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session
from core.auth import get_current_supabase_user
from core.database import get_db
from modules.student_growth.models import (
    AppUser, StudentProfile, TeacherProfile, ParentProfile, ParentStudentLink,
    TeacherClassroom, Classroom, Subject, Topic, LearningLog, RevisionTask,
    PeerHelpRequest, PeerHelpOffer, PeerHelpSession,
)


def deny():
    raise HTTPException(403, "You do not have access to this record.")


def current_actor(payload=Depends(get_current_supabase_user), db: Session = Depends(get_db)):
    actor = db.query(AppUser).filter(AppUser.supabase_user_id == payload.get('sub')).first()
    if actor is None or actor.status != 'ACTIVE':
        deny()
    return actor


def require_admin(actor=Depends(current_actor)):
    if actor.role != 'ADMIN':
        deny()
    return actor


def student_profile(db, actor):
    profile = db.query(StudentProfile).filter_by(user_id=actor.id).first()
    if actor.role != 'STUDENT' or profile is None:
        deny()
    return profile


def require_student_access(db, actor, student_id, write=False):
    student = db.get(StudentProfile, student_id)
    if student is None:
        deny()
    if actor.role == 'ADMIN':
        return student
    if actor.role == 'STUDENT' and student.user_id == actor.id:
        return student
    if not write and actor.role == 'PARENT':
        parent = db.query(ParentProfile).filter_by(user_id=actor.id).first()
        if parent and db.query(ParentStudentLink).filter_by(parent_profile_id=parent.id, student_profile_id=student.id, status='ACTIVE').first():
            return student
    if not write and actor.role == 'TEACHER':
        require_classroom_access(db, actor, student.classroom_id)
        return student
    deny()


def require_classroom_access(db, actor, classroom_id):
    classroom = db.get(Classroom, classroom_id) if classroom_id else None
    if classroom is None:
        deny()
    if actor.role == 'ADMIN':
        return classroom
    if actor.role == 'STUDENT':
        p = student_profile(db, actor)
        if p.classroom_id == classroom.id and p.school_id == classroom.school_id:
            return classroom
    if actor.role == 'TEACHER':
        p = db.query(TeacherProfile).filter_by(user_id=actor.id).first()
        if p and p.school_id == classroom.school_id and db.query(TeacherClassroom).filter_by(teacher_profile_id=p.id, classroom_id=classroom.id, status='ACTIVE').first():
            return classroom
    deny()


def school_ids(db, actor):
    if actor.role == 'STUDENT':
        p = student_profile(db, actor)
        return {p.school_id} - {None}
    if actor.role == 'TEACHER':
        p = db.query(TeacherProfile).filter_by(user_id=actor.id).first()
        return {p.school_id} - {None} if p else set()
    if actor.role == 'PARENT':
        p = db.query(ParentProfile).filter_by(user_id=actor.id).first()
        if p:
            return {row[0] for row in db.query(StudentProfile.school_id).join(ParentStudentLink, ParentStudentLink.student_profile_id == StudentProfile.id).filter(ParentStudentLink.parent_profile_id == p.id, ParentStudentLink.status == 'ACTIVE').all()} - {None}
    return set()


def validate_learning_scope(db, actor, data, student_field='student_id'):
    student = require_student_access(db, actor, data.get(student_field), write=True)
    classroom = db.get(Classroom, data.get('classroom_id')) if data.get('classroom_id') else None
    subject = db.get(Subject, data.get('subject_id')) if data.get('subject_id') else None
    topic = db.get(Topic, data.get('topic_id')) if data.get('topic_id') else None
    if not classroom or not subject or not topic:
        raise HTTPException(422, 'Choose a valid class, subject and topic.')
    if (data.get('school_id') != student.school_id or classroom.id != student.classroom_id
        or classroom.school_id != student.school_id or subject.school_id != student.school_id
        or topic.subject_id != subject.id):
        deny()
    return student


async def authorize_growth(request: Request, actor=Depends(current_actor), db: Session = Depends(get_db)):
    """Explicit route policy; unknown additions remain administrator-only."""
    request.state.actor = actor
    if actor.role == 'ADMIN':
        return
    name = request.scope['route'].name
    params = request.path_params
    read = request.method == 'GET'
    if name in {'get_learning_logs_for_student', 'get_revisions_for_student', 'get_rewards_for_student', 'get_attempts_for_student', 'get_student_habit_summary', 'get_parent_student_summary', 'list_student_sessions'}:
        require_student_access(db, actor, int(params['student_id']))
        return
    if name in {'complete_revision', 'get_attempts_for_revision'}:
        task = db.get(RevisionTask, int(params['revision_task_id']))
        if task is None:
            deny()
        require_student_access(db, actor, task.student_id, write=not read)
        return
    if name == 'create_learning_log':
        validate_learning_scope(db, actor, await request.json())
        return
    if name == 'get_teacher_classroom_summary':
        if actor.role != 'TEACHER':
            deny()
        require_classroom_access(db, actor, int(params['classroom_id']))
        return
    if name == 'list_schools':
        return  # Controller scopes the returned rows.
    if name in {'list_classrooms_by_school', 'list_subjects_by_school'}:
        if int(params['school_id']) not in school_ids(db, actor):
            deny()
        return
    if name == 'list_topics_by_subject':
        subject = db.get(Subject, int(params['subject_id']))
        if subject is None or subject.school_id not in school_ids(db, actor):
            deny()
        return
    if name in {'list_open_requests', 'list_available_offers', 'get_topic_support_circle'}:
        # Peer controller derives the classroom scope from this authenticated student.
        p = student_profile(db, actor)
        if not p.school_id or not p.classroom_id:
            deny()
        require_classroom_access(db, actor, p.classroom_id)
        return
    if name in {'create_help_request', 'create_help_offer'}:
        data = await request.json()
        field = 'requester_student_id' if name == 'create_help_request' else 'helper_student_id'
        p = validate_learning_scope(db, actor, data, field)
        if data.get('learning_log_id'):
            log = db.get(LearningLog, data['learning_log_id'])
            if not log or log.student_id != p.id or log.topic_id != data['topic_id']:
                deny()
        return
    if name == 'accept_help_request':
        data = await request.json()
        p = student_profile(db, actor)
        record = db.get(PeerHelpRequest, int(params['help_request_id']))
        if not record or data.get('helper_student_id') != p.id or record.classroom_id != p.classroom_id or record.school_id != p.school_id:
            deny()
        if data.get('help_offer_id'):
            offer = db.get(PeerHelpOffer, data['help_offer_id'])
            if not offer or offer.helper_student_id != p.id or offer.topic_id != record.topic_id or offer.classroom_id != p.classroom_id:
                deny()
        return
    if name == 'complete_help_session':
        p = student_profile(db, actor)
        record = db.get(PeerHelpSession, int(params['session_id']))
        if not record or p.id not in {record.requester_student_id, record.helper_student_id} or record.classroom_id != p.classroom_id:
            deny()
        data = await request.json()
        if (data.get('requester_feedback') and p.id != record.requester_student_id) or (data.get('helper_reflection') and p.id != record.helper_student_id):
            deny()
        return
    deny()
