import enum
from typing import List, Optional, TYPE_CHECKING

from sqlalchemy import String, Text, ForeignKey, Enum as SQLEnum, Index
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from .base import UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from .project import Project


class JourneyStatus(str, enum.Enum):
    DRAFT = "draft"
    VALIDATED = "validated"
    ARCHIVED = "archived"


class UserJourney(Base, UUIDMixin, TimestampMixin):
    """Stores user journey maps with phases and steps."""
    __tablename__ = "user_journeys"

    project_id: Mapped[str] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    persona: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Journey structure stored as JSONB
    phases: Mapped[List[dict]] = mapped_column(JSONB, default=list)
    # Format: [{"id": "phase_1", "name": "Discovery", "order": 0}, ...]

    steps: Mapped[List[dict]] = mapped_column(JSONB, default=list)
    # Format: [
    #   {
    #     "id": "step_1",
    #     "phase_id": "phase_1",
    #     "action": "Searches on Google",
    #     "touchpoint": "web",
    #     "emotion": 3,  # 1-5 scale
    #     "thought": "This looks interesting",
    #     "pain_point": null,
    #     "opportunity": null,
    #     "order": 0
    #   },
    #   ...
    # ]

    status: Mapped[JourneyStatus] = mapped_column(
        SQLEnum(JourneyStatus),
        default=JourneyStatus.DRAFT,
    )
    tags: Mapped[List[str]] = mapped_column(ARRAY(String), default=list)

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="user_journeys")

    __table_args__ = (
        Index("ix_user_journeys_project_status", "project_id", "status"),
    )
