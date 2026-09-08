"""Platform-owner school setup and atomic account enrollment."""
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from core.access import require_admin
from core.database import get_db
from modules.student_growth.models import (AppUser, School, Classroom, StudentProfile,
    TeacherProfile, ParentProfile, TeacherClassroom, ParentStudentLink, ClassroomStudent)
router = APIRouter(prefix='/api/v1/school-admin', dependencies=[Depends(require_admin)])

class Enrollment(BaseModel):
    full_name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=254)
    role: Literal['STUDENT', 'TEACHER', 'PARENT']
    school_id: int
    classroom_id: int | None = None
    child_id: int | None = None

@router.post('/enroll', status_code=201)
def enroll(payload: Enrollment, db: Session = Depends(get_db)):
    school = db.get(School, payload.school_id)
    if not school:
        raise HTTPException(422, 'Choose an existing school.')
    email = payload.email.strip().lower()
    if '@' not in email or ' ' in email:
        raise HTTPException(422, 'Enter a valid email address.')
    classroom = db.get(Classroom, payload.classroom_id) if payload.classroom_id else None
    if payload.role in {'STUDENT','TEACHER'} and (not classroom or classroom.school_id != school.id):
        raise HTTPException(422, 'Choose a class in this school.')
    child = db.get(StudentProfile, payload.child_id) if payload.child_id else None
    if payload.role == 'PARENT' and (not child or child.school_id != school.id):
        raise HTTPException(422, 'Choose a child in this school.')
    try:
        user = AppUser(full_name=payload.full_name.strip(), email=email, role=payload.role, status='ACTIVE')
        db.add(user); db.flush()
        if payload.role == 'STUDENT':
            profile = StudentProfile(user_id=user.id, school_id=school.id, classroom_id=classroom.id, display_name=user.full_name)
            db.add(profile); db.flush()
            db.add(ClassroomStudent(classroom_id=classroom.id, student_profile_id=profile.id, status='ACTIVE'))
        elif payload.role == 'TEACHER':
            profile = TeacherProfile(user_id=user.id, school_id=school.id, display_name=user.full_name)
            db.add(profile); db.flush()
            db.add(TeacherClassroom(teacher_profile_id=profile.id, classroom_id=classroom.id, status='ACTIVE'))
        else:
            profile = ParentProfile(user_id=user.id, display_name=user.full_name)
            db.add(profile); db.flush()
            db.add(ParentStudentLink(parent_profile_id=profile.id, student_profile_id=child.id, status='ACTIVE'))
        db.commit()
        return {'user_id':user.id, 'profile_id':profile.id, 'email':email, 'message':'Enrolled. This person can activate their account with the same email on the login page.'}
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, 'This email already has an account. Use the existing account.')

@router.get('/schools/{school_id}/students')
def school_students(school_id:int, db:Session=Depends(get_db)):
    return [{'id':p.id,'display_name':p.display_name,'classroom_id':p.classroom_id} for p in db.query(StudentProfile).filter_by(school_id=school_id).all()]
