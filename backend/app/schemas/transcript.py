from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.models.transcript import TranscriptSource, ProcessingStatus


class TranscriptCreate(BaseModel):
    """Schema for creating a transcript."""

    title: str = Field(..., min_length=1, max_length=255)
    source: TranscriptSource
    raw_content: str
    participants: List[str] = []
    duration_seconds: Optional[int] = None
    meeting_date: Optional[datetime] = None


class TranscriptUpdate(BaseModel):
    """Schema for updating a transcript."""

    title: Optional[str] = Field(None, min_length=1, max_length=255)
    parsed_content: Optional[dict] = None
    participants: Optional[List[str]] = None
    processing_status: Optional[ProcessingStatus] = None


class TranscriptResponse(BaseModel):
    """Schema for transcript response."""

    id: str
    project_id: str
    title: str
    source: TranscriptSource
    raw_content: str
    parsed_content: Optional[dict] = None
    participants: List[str]
    processing_status: ProcessingStatus
    duration_seconds: Optional[int] = None
    meeting_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TranscriptListResponse(BaseModel):
    """Schema for transcript list item (excludes raw content)."""

    id: str
    title: str
    source: TranscriptSource
    participants: List[str]
    processing_status: ProcessingStatus
    duration_seconds: Optional[int] = None
    meeting_date: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
