from datetime import datetime
from typing import Optional, Any

from pydantic import BaseModel, Field

from app.models.diagram_entity import DiagramType


class DiagramBase(BaseModel):
    """Base diagram fields."""

    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    diagram_type: DiagramType


class DiagramCreate(DiagramBase):
    """Schema for creating a diagram."""

    data: dict  # The actual diagram data (nodes/edges or mermaid code)


class DiagramUpdate(BaseModel):
    """Schema for updating a diagram."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    data: Optional[dict] = None


class DiagramResponse(DiagramBase):
    """Schema for full diagram response."""

    id: str
    project_id: str
    data: dict
    thumbnail: Optional[str] = None
    version: int
    parent_version_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DiagramListResponse(BaseModel):
    """Schema for diagram list item (excludes full data)."""

    id: str
    name: str
    description: Optional[str]
    diagram_type: DiagramType
    thumbnail: Optional[str]
    version: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
