import enum
from datetime import datetime
from typing import List, Optional, TYPE_CHECKING

from sqlalchemy import String, Text, ForeignKey, Enum as SQLEnum, DateTime
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from .base import UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from .project import Project


class DecisionStatus(str, enum.Enum):
    PROPOSED = "proposed"
    APPROVED = "approved"
    REJECTED = "rejected"
    SUPERSEDED = "superseded"


class Decision(Base, UUIDMixin, TimestampMixin):
    """Stores traced decisions with rationale."""
    __tablename__ = "decisions"

    project_id: Mapped[str] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    rationale: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[DecisionStatus] = mapped_column(
        SQLEnum(DecisionStatus),
        default=DecisionStatus.PROPOSED,
    )

    # Alternatives considered
    alternatives: Mapped[List[dict]] = mapped_column(JSONB, default=list)
    # Format: [{"option": "Option A", "pros": [...], "cons": [...]}]

    # Impact/affected areas
    affected_areas: Mapped[List[str]] = mapped_column(ARRAY(String), default=list)

    # Traceability
    decided_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    decided_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    superseded_by_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("decisions.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="decisions")
