from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.models.project import ProjectStatus


class ProjectBase(BaseModel):
    """Base project fields."""

    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    tags: List[str] = []
    external_refs: dict = {}


class ProjectCreate(ProjectBase):
    """Schema for creating a project."""

    pass


class ProjectUpdate(BaseModel):
    """Schema for updating a project."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None
    tags: Optional[List[str]] = None
    external_refs: Optional[dict] = None


class ProjectResponse(ProjectBase):
    """Schema for project response."""

    id: str
    status: ProjectStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectListResponse(BaseModel):
    """Schema for project list item with counts."""

    id: str
    name: str
    description: Optional[str]
    status: ProjectStatus
    tags: List[str]
    created_at: datetime
    updated_at: datetime

    # Entity counts
    story_count: int = 0
    diagram_count: int = 0
    question_count: int = 0
    decision_count: int = 0
    transcript_count: int = 0

    class Config:
        from_attributes = True


class ProjectDetailResponse(ProjectResponse):
    """Schema for full project detail with nested entities."""

    # Counts
    story_count: int = 0
    diagram_count: int = 0
    question_count: int = 0
    decision_count: int = 0
    transcript_count: int = 0
