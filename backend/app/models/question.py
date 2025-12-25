import enum
from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import String, Text, ForeignKey, Enum as SQLEnum, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from .base import UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from .project import Project


class QuestionStatus(str, enum.Enum):
    OPEN = "open"
    ANSWERED = "answered"
    DEFERRED = "deferred"
    CLOSED = "closed"


class Question(Base, UUIDMixin, TimestampMixin):
    """Stores open questions extracted from transcripts."""
    __tablename__ = "questions"

    project_id: Mapped[str] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    question: Mapped[str] = mapped_column(Text, nullable=False)
    context: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[QuestionStatus] = mapped_column(
        SQLEnum(QuestionStatus),
        default=QuestionStatus.OPEN,
    )
    answer: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    answered_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    answered_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Source traceability
    source_transcript_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("transcripts.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="questions")
