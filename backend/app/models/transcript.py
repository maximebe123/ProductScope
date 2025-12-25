import enum
from datetime import datetime
from typing import List, Optional, TYPE_CHECKING

from sqlalchemy import String, Text, Integer, ForeignKey, Enum as SQLEnum, DateTime
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from .base import UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from .project import Project
    from .story import Story


class TranscriptSource(str, enum.Enum):
    TEAMS = "teams"
    ZOOM = "zoom"
    GOOGLE_MEET = "google_meet"
    OTTER = "otter"
    HYPRNOTE = "hyprnote"
    FIREFLIES = "fireflies"
    UPLOAD = "upload"
    MANUAL = "manual"


class ProcessingStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Transcript(Base, UUIDMixin, TimestampMixin):
    """Stores imported meeting transcripts."""
    __tablename__ = "transcripts"

    project_id: Mapped[str] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    source: Mapped[TranscriptSource] = mapped_column(
        SQLEnum(TranscriptSource),
        nullable=False,
    )
    raw_content: Mapped[str] = mapped_column(Text, nullable=False)
    parsed_content: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    # parsed_content: {segments: [{speaker, text, timestamp}], topics: [...], summary: "..."}

    participants: Mapped[List[str]] = mapped_column(ARRAY(String), default=list)
    processing_status: Mapped[ProcessingStatus] = mapped_column(
        SQLEnum(ProcessingStatus),
        default=ProcessingStatus.PENDING,
    )
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    meeting_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="transcripts")
    stories: Mapped[List["Story"]] = relationship(
        "Story",
        back_populates="source_transcript",
        foreign_keys="Story.source_transcript_id",
    )
