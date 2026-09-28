"""Schemas for school setup dropdown data."""

from modules.student_growth.ist_time import UtcDateTime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class SchoolCreate(BaseModel):
    name: str = Field(..., min_length=1)
    city: Optional[str] = None


class SchoolResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    city: Optional[str] = None
    created_at: Optional[UtcDateTime] = None


class ClassroomCreate(BaseModel):
    school_id: int
    name: str = Field(..., min_length=1)
    grade: str = Field(..., min_length=1)
    section: str = Field(..., min_length=1)
    academic_year: str = Field(..., min_length=1)


class ClassroomResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    school_id: Optional[int] = None
    name: str
    grade: Optional[str] = None
    section: Optional[str] = None
    academic_year: Optional[str] = None
    created_at: Optional[UtcDateTime] = None


class SubjectCreate(BaseModel):
    school_id: int
    name: str = Field(..., min_length=1)


class SubjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    school_id: Optional[int] = None
    name: str
    created_at: Optional[UtcDateTime] = None


class TopicCreate(BaseModel):
    subject_id: int
    name: str = Field(..., min_length=1)


class TopicResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    subject_id: Optional[int] = None
    name: str
    created_at: Optional[UtcDateTime] = None
