from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.models.story import StoryType, StoryPriority, StoryStatus


class AcceptanceCriterion(BaseModel):
    """Schema for acceptance criterion."""

    id: str
    criterion: str
    status: str = "pending"


class StoryBase(BaseModel):
    """Base story fields."""

    title: str = Field(..., min_length=1, max_length=500)
    as_a: Optional[str] = None
    i_want: Optional[str] = None
    so_that: Optional[str] = None
    acceptance_criteria: List[dict] = []
    story_type: StoryType = StoryType.USER_STORY
    priority: StoryPriority = StoryPriority.MEDIUM
    story_points: Optional[int] = None
    tags: List[str] = []


class StoryCreate(StoryBase):
    """Schema for creating a story."""

    source_transcript_id: Optional[str] = None


class StoryUpdate(BaseModel):
    """Schema for updating a story."""

    title: Optional[str] = Field(None, min_length=1, max_length=500)
    as_a: Optional[str] = None
    i_want: Optional[str] = None
    so_that: Optional[str] = None
    acceptance_criteria: Optional[List[dict]] = None
    story_type: Optional[StoryType] = None
    priority: Optional[StoryPriority] = None
    status: Optional[StoryStatus] = None
    story_points: Optional[int] = None
    tags: Optional[List[str]] = None
    external_ref: Optional[dict] = None


class StoryResponse(StoryBase):
    """Schema for story response."""

    id: str
    project_id: str
    status: StoryStatus
    source_transcript_id: Optional[str] = None
    external_ref: Optional[dict] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
