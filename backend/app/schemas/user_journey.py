from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.models.user_journey import JourneyStatus


class JourneyPhase(BaseModel):
    """Schema for a journey phase."""

    id: str
    name: str
    order: int


class JourneyStep(BaseModel):
    """Schema for a journey step."""

    id: str
    phase_id: str
    action: str
    touchpoint: str
    emotion: int = Field(..., ge=1, le=5)  # 1-5 scale
    thought: Optional[str] = None
    pain_point: Optional[str] = None
    opportunity: Optional[str] = None
    order: int


class UserJourneyBase(BaseModel):
    """Base user journey fields."""

    title: str = Field(..., min_length=1, max_length=500)
    persona: Optional[str] = None
    description: Optional[str] = None
    phases: List[JourneyPhase] = []
    steps: List[JourneyStep] = []
    tags: List[str] = []


class UserJourneyCreate(UserJourneyBase):
    """Schema for creating a user journey."""
    pass


class UserJourneyUpdate(BaseModel):
    """Schema for updating a user journey."""

    title: Optional[str] = Field(None, min_length=1, max_length=500)
    persona: Optional[str] = None
    description: Optional[str] = None
    phases: Optional[List[JourneyPhase]] = None
    steps: Optional[List[JourneyStep]] = None
    status: Optional[JourneyStatus] = None
    tags: Optional[List[str]] = None


class UserJourneyResponse(UserJourneyBase):
    """Schema for user journey response."""

    id: str
    project_id: str
    status: JourneyStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserJourneyGenerateRequest(BaseModel):
    """Schema for AI user journey generation request."""

    persona: str = Field(..., min_length=1, max_length=255)
    goal: str = Field(..., min_length=10, max_length=2000)


class UserJourneyGenerateResponse(BaseModel):
    """Schema for AI user journey generation response."""

    journey: UserJourneyResponse
