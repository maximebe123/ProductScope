"""Pydantic schemas for Decisions."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.models.decision import DecisionStatus


class AlternativeOption(BaseModel):
    """Schema for an alternative option considered."""

    option: str
    pros: List[str] = []
    cons: List[str] = []


class DecisionCreate(BaseModel):
    """Schema for creating a decision."""

    title: str = Field(..., min_length=1, max_length=500)
    description: str = Field(..., min_length=1)
    rationale: Optional[str] = None
    alternatives: List[AlternativeOption] = []
    affected_areas: List[str] = []


class DecisionUpdate(BaseModel):
    """Schema for updating a decision."""

    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = Field(None, min_length=1)
    rationale: Optional[str] = None
    status: Optional[DecisionStatus] = None
    alternatives: Optional[List[AlternativeOption]] = None
    affected_areas: Optional[List[str]] = None
    decided_by: Optional[str] = None


class DecisionResponse(BaseModel):
    """Schema for decision response."""

    id: str
    project_id: str
    title: str
    description: str
    rationale: Optional[str] = None
    status: DecisionStatus
    alternatives: List[dict] = []
    affected_areas: List[str] = []
    decided_by: Optional[str] = None
    decided_at: Optional[datetime] = None
    superseded_by_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
