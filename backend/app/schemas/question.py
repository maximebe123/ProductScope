"""Pydantic schemas for Questions."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.question import QuestionStatus


class QuestionCreate(BaseModel):
    """Schema for creating a question."""

    question: str = Field(..., min_length=1)
    context: Optional[str] = None
    source_transcript_id: Optional[str] = None


class QuestionUpdate(BaseModel):
    """Schema for updating a question."""

    question: Optional[str] = Field(None, min_length=1)
    context: Optional[str] = None
    status: Optional[QuestionStatus] = None
    answer: Optional[str] = None
    answered_by: Optional[str] = None


class QuestionResponse(BaseModel):
    """Schema for question response."""

    id: str
    project_id: str
    question: str
    context: Optional[str] = None
    status: QuestionStatus
    answer: Optional[str] = None
    answered_by: Optional[str] = None
    answered_at: Optional[datetime] = None
    source_transcript_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
