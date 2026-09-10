"""Pydantic schemas for Google Drive student uploads."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


DriveCategory = Literal["proof", "document"]


class DriveUploadResponse(BaseModel):
    """API response after a successful Drive upload."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    category: str
    drive_file_id: str
    webViewLink: str | None = Field(default=None, validation_alias="web_view_link", serialization_alias="webViewLink")
    name: str = Field(validation_alias="file_name", serialization_alias="name")
    mime: str = Field(validation_alias="mime_type", serialization_alias="mime")
    size: int = Field(validation_alias="size_bytes", serialization_alias="size")
    student_profile_id: int
    created_at: datetime


class DriveUploadListItem(BaseModel):
    """Lightweight list item for a student's Drive uploads."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    category: str
    drive_file_id: str
    webViewLink: str | None = Field(default=None, validation_alias="web_view_link", serialization_alias="webViewLink")
    name: str = Field(validation_alias="file_name", serialization_alias="name")
    mime: str = Field(validation_alias="mime_type", serialization_alias="mime")
    size: int = Field(validation_alias="size_bytes", serialization_alias="size")
    created_at: datetime
