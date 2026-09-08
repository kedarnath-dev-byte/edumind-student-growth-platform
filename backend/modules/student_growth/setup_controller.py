from core.access import authorize_growth, current_actor, school_ids
"""HTTP endpoints for school setup dropdown data."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.database import get_db
from modules.student_growth.setup_schemas import (
    ClassroomCreate,
    ClassroomResponse,
    SchoolCreate,
    SchoolResponse,
    SubjectCreate,
    SubjectResponse,
    TopicCreate,
    TopicResponse,
)
from modules.student_growth.setup_service import SetupService

router = APIRouter(dependencies=[Depends(authorize_growth)], prefix="/api/v1", tags=["School Setup"])


@router.post("/schools", response_model=SchoolResponse)
def create_school(payload: SchoolCreate, db: Session = Depends(get_db)):
    return SetupService(db).create_school(payload)


@router.get("/schools", response_model=list[SchoolResponse])
def list_schools(db: Session = Depends(get_db), actor=Depends(current_actor)):
    return [school for school in SetupService(db).list_schools() if actor.role == 'ADMIN' or school.id in school_ids(db, actor)]


@router.post("/classrooms", response_model=ClassroomResponse)
def create_classroom(payload: ClassroomCreate, db: Session = Depends(get_db)):
    return SetupService(db).create_classroom(payload)


@router.get("/classrooms", response_model=list[ClassroomResponse])
def list_classrooms(db: Session = Depends(get_db)):
    return SetupService(db).list_classrooms()


@router.get("/classrooms/school/{school_id}", response_model=list[ClassroomResponse])
def list_classrooms_by_school(school_id: int, db: Session = Depends(get_db)):
    return SetupService(db).list_classrooms_by_school(school_id)


@router.post("/subjects", response_model=SubjectResponse)
def create_subject(payload: SubjectCreate, db: Session = Depends(get_db)):
    return SetupService(db).create_subject(payload)


@router.get("/subjects", response_model=list[SubjectResponse])
def list_subjects(db: Session = Depends(get_db)):
    return SetupService(db).list_subjects()


@router.get("/subjects/school/{school_id}", response_model=list[SubjectResponse])
def list_subjects_by_school(school_id: int, db: Session = Depends(get_db)):
    return SetupService(db).list_subjects_by_school(school_id)


@router.post("/topics", response_model=TopicResponse)
def create_topic(payload: TopicCreate, db: Session = Depends(get_db)):
    return SetupService(db).create_topic(payload)


@router.get("/topics", response_model=list[TopicResponse])
def list_topics(db: Session = Depends(get_db)):
    return SetupService(db).list_topics()


@router.get("/topics/subject/{subject_id}", response_model=list[TopicResponse])
def list_topics_by_subject(subject_id: int, db: Session = Depends(get_db)):
    return SetupService(db).list_topics_by_subject(subject_id)
