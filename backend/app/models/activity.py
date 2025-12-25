import enum
from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import String, ForeignKey, Enum as SQLEnum, DateTime, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from .base import UUIDMixin

if TYPE_CHECKING:
    from .project import Project


class ActivityType(str, enum.Enum):
    # Project
    PROJECT_CREATED = "project_created"
    PROJECT_UPDATED = "project_updated"
    PROJECT_ARCHIVED = "project_archived"

    # Transcript
    TRANSCRIPT_UPLOADED = "transcript_uploaded"
    TRANSCRIPT_PROCESSED = "transcript_processed"

    # Story
    STORY_CREATED = "story_created"
    STORY_UPDATED = "story_updated"
    STORY_EXPORTED = "story_exported"

    # Question
    QUESTION_CREATED = "question_created"
    QUESTION_ANSWERED = "question_answered"

    # Decision
    DECISION_MADE = "decision_made"
    DECISION_SUPERSEDED = "decision_superseded"

    # AI Operations
    AI_GENERATION = "ai_generation"
    AI_MODIFICATION = "ai_modification"

    # Diagram
    DIAGRAM_CREATED = "diagram_created"
    DIAGRAM_UPDATED = "diagram_updated"
    DIAGRAM_EXPORTED = "diagram_exported"

    # Export
    EXPORT_COMPLETED = "export_completed"
    EXPORT_FAILED = "export_failed"


class ActorType(str, enum.Enum):
    USER = "user"
    SYSTEM = "system"
    AI = "ai"


class Activity(Base, UUIDMixin):
    """Timeline of all actions within a project."""
    __tablename__ = "activities"

    project_id: Mapped[str] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    activity_type: Mapped[ActivityType] = mapped_column(
        SQLEnum(ActivityType),
        nullable=False,
    )
    actor_type: Mapped[ActorType] = mapped_column(
        SQLEnum(ActorType),
        nullable=False,
    )
    actor_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Activity details
    details: Mapped[dict] = mapped_column(JSONB, default=dict)
    # Format varies by type: {"entity_id": "...", "entity_type": "story", "changes": {...}}

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="activities")

    __table_args__ = (
        Index("ix_activities_project_time", "project_id", "timestamp"),
    )
