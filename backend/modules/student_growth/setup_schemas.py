"""Schemas for school setup dropdown data."""

from datetime import datetime
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
    created_at: datetime


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
    created_at: datetime


class SubjectCreate(BaseModel):
    school_id: int
    name: str = Field(..., min_length=1)


class SubjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    school_id: Optional[int] = None
    name: str
    created_at: datetime


class TopicCreate(BaseModel):
    subject_id: int
    name: str = Field(..., min_length=1)


class TopicResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    subject_id: Optional[int] = None
    name: str
    created_at: datetime
