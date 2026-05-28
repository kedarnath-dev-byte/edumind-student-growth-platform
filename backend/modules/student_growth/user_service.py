"""Service layer for pilot users, profiles, and role links."""

from typing import List, Optional

from sqlalchemy.orm import Session

from modules.student_growth.models import (
    AppUser,
    Classroom,
    ClassroomStudent,
    ParentProfile,
    ParentStudentLink,
    StudentProfile,
    TeacherClassroom,
    TeacherProfile,
)
from modules.student_growth.user_schemas import (
    AppUserCreate,
    ClassroomStudentCreate,
    ParentProfileCreate,
    ParentStudentLinkCreate,
    StudentProfileCreate,
    TeacherClassroomCreate,
    TeacherProfileCreate,
)


class UserNotFoundError(Exception):
    """Raised when a user/profile/link lookup cannot be completed."""


class UserService:
    """Creates and reads pilot identity foundation data."""

    def __init__(self, db: Session):
        self.db = db

    def create_user(self, payload: AppUserCreate) -> AppUser:
        user = AppUser(**payload.model_dump(), status="ACTIVE")
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def list_users(self, role: Optional[str] = None) -> List[AppUser]:
        query = self.db.query(AppUser)
        if role:
            query = query.filter(AppUser.role == role)
        return query.order_by(AppUser.created_at.desc()).all()

    def create_student_profile(self, payload: StudentProfileCreate) -> StudentProfile:
        profile = StudentProfile(**payload.model_dump())
        self.db.add(profile)
        self.db.commit()
        self.db.refresh(profile)
        return profile

    def get_student_profile(self, student_profile_id: int) -> StudentProfile:
        profile = (
            self.db.query(StudentProfile)
            .filter(StudentProfile.id == student_profile_id)
            .first()
        )
        if profile is None:
            raise UserNotFoundError("Student profile not found")
        return profile

    def create_teacher_profile(self, payload: TeacherProfileCreate) -> TeacherProfile:
        profile = TeacherProfile(**payload.model_dump())
        self.db.add(profile)
        self.db.commit()
        self.db.refresh(profile)
        return profile

    def create_parent_profile(self, payload: ParentProfileCreate) -> ParentProfile:
        profile = ParentProfile(**payload.model_dump())
        self.db.add(profile)
        self.db.commit()
        self.db.refresh(profile)
        return profile

    def create_parent_student_link(
        self,
        payload: ParentStudentLinkCreate,
    ) -> ParentStudentLink:
        link = ParentStudentLink(**payload.model_dump(), status="ACTIVE")
        self.db.add(link)
        self.db.commit()
        self.db.refresh(link)
        return link

    def create_classroom_student(
        self,
        payload: ClassroomStudentCreate,
    ) -> ClassroomStudent:
        link = ClassroomStudent(**payload.model_dump(), status="ACTIVE")
        self.db.add(link)
        self.db.commit()
        self.db.refresh(link)
        return link

    def create_teacher_classroom(
        self,
        payload: TeacherClassroomCreate,
    ) -> TeacherClassroom:
        link = TeacherClassroom(**payload.model_dump(), status="ACTIVE")
        self.db.add(link)
        self.db.commit()
        self.db.refresh(link)
        return link

    def list_parent_children(self, parent_profile_id: int) -> List[StudentProfile]:
        links = (
            self.db.query(ParentStudentLink)
            .filter(
                ParentStudentLink.parent_profile_id == parent_profile_id,
                ParentStudentLink.status == "ACTIVE",
            )
            .all()
        )
        student_profile_ids = [link.student_profile_id for link in links]
        if not student_profile_ids:
            return []
        return (
            self.db.query(StudentProfile)
            .filter(StudentProfile.id.in_(student_profile_ids))
            .order_by(StudentProfile.display_name.asc())
            .all()
        )

    def list_teacher_classrooms(self, teacher_profile_id: int) -> List[Classroom]:
        links = (
            self.db.query(TeacherClassroom)
            .filter(
                TeacherClassroom.teacher_profile_id == teacher_profile_id,
                TeacherClassroom.status == "ACTIVE",
            )
            .all()
        )
        classroom_ids = [link.classroom_id for link in links]
        if not classroom_ids:
            return []
        return (
            self.db.query(Classroom)
            .filter(Classroom.id.in_(classroom_ids))
            .order_by(Classroom.name.asc())
            .all()
        )
