"""Schemas for pilot-ready users, profiles, and safe role links."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class AppUserCreate(BaseModel):
    full_name: str = Field(..., min_length=1)
    email: Optional[str] = None
    phone: Optional[str] = None
    role: str


class AppUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: str
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None


class StudentProfileCreate(BaseModel):
    user_id: int
    school_id: Optional[int] = None
    classroom_id: Optional[int] = None
    display_name: str = Field(..., min_length=1)
    guardian_contact: Optional[str] = None


class StudentProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    school_id: Optional[int] = None
    classroom_id: Optional[int] = None
    display_name: str
    guardian_contact: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class TeacherProfileCreate(BaseModel):
    user_id: int
    school_id: Optional[int] = None
    display_name: str = Field(..., min_length=1)


class TeacherProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    school_id: Optional[int] = None
    display_name: str
    created_at: datetime
    updated_at: Optional[datetime] = None


class ParentProfileCreate(BaseModel):
    user_id: int
    display_name: str = Field(..., min_length=1)
    phone: Optional[str] = None


class ParentProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    display_name: str
    phone: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class ParentStudentLinkCreate(BaseModel):
    parent_profile_id: int
    student_profile_id: int
    relationship: Optional[str] = None


class ParentStudentLinkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    parent_profile_id: int
    student_profile_id: int
    relationship: Optional[str] = None
    status: str
    created_at: datetime


class ClassroomStudentCreate(BaseModel):
    classroom_id: int
    student_profile_id: int


class ClassroomStudentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    classroom_id: int
    student_profile_id: int
    status: str
    created_at: datetime


class TeacherClassroomCreate(BaseModel):
    teacher_profile_id: int
    classroom_id: int


class TeacherClassroomResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    teacher_profile_id: int
    classroom_id: int
    status: str
    created_at: datetime
