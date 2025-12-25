import enum
from typing import List, Optional, TYPE_CHECKING

from sqlalchemy import String, Text, Integer, ForeignKey, Enum as SQLEnum, Index
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from .base import UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from .project import Project
    from .transcript import Transcript


class StoryType(str, enum.Enum):
    USER_STORY = "user_story"
    TECHNICAL = "technical"
    BUG = "bug"
    SPIKE = "spike"
    EPIC = "epic"


class StoryPriority(str, enum.Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class StoryStatus(str, enum.Enum):
    DRAFT = "draft"
    REFINED = "refined"
    APPROVED = "approved"
    EXPORTED = "exported"


class Story(Base, UUIDMixin, TimestampMixin):
    """Stores user stories with acceptance criteria."""
    __tablename__ = "stories"

    project_id: Mapped[str] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)

    # User story format
    as_a: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    i_want: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    so_that: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Acceptance criteria stored as JSONB array
    acceptance_criteria: Mapped[List[dict]] = mapped_column(JSONB, default=list)
    # Format: [{"id": "ac_1", "criterion": "Given... When... Then...", "status": "pending"}]

    story_type: Mapped[StoryType] = mapped_column(
        SQLEnum(StoryType),
        default=StoryType.USER_STORY,
    )
    priority: Mapped[StoryPriority] = mapped_column(
        SQLEnum(StoryPriority),
        default=StoryPriority.MEDIUM,
    )
    status: Mapped[StoryStatus] = mapped_column(
        SQLEnum(StoryStatus),
        default=StoryStatus.DRAFT,
    )

    # Traceability
    source_transcript_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("transcripts.id", ondelete="SET NULL"),
        nullable=True,
    )
    external_ref: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    # external_ref: {"jira_key": "PROJ-456", "exported_at": "..."}

    story_points: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    tags: Mapped[List[str]] = mapped_column(ARRAY(String), default=list)

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="stories")
    source_transcript: Mapped[Optional["Transcript"]] = relationship(
        "Transcript",
        back_populates="stories",
        foreign_keys=[source_transcript_id],
    )

    __table_args__ = (
        Index("ix_stories_project_status", "project_id", "status"),
        Index("ix_stories_project_priority", "project_id", "priority"),
    )
