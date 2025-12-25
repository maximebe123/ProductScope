import enum
from typing import List, Optional, TYPE_CHECKING

from sqlalchemy import String, Text, ForeignKey, Enum as SQLEnum, Index
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from .base import UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from .project import Project


class FeatureStatus(str, enum.Enum):
    DRAFT = "draft"
    DEFINED = "defined"
    IN_PROGRESS = "in_progress"
    SHIPPED = "shipped"
    ARCHIVED = "archived"


class FeaturePriority(str, enum.Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class Feature(Base, UUIDMixin, TimestampMixin):
    """Stores feature specifications with structured sections."""
    __tablename__ = "features"

    project_id: Mapped[str] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)

    # Structured sections
    problem: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    solution: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    target_users: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    success_metrics: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Links to other entities
    user_stories: Mapped[List[str]] = mapped_column(JSONB, default=list)
    # Format: ["story_id_1", "story_id_2", ...]

    technical_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Metadata
    status: Mapped[FeatureStatus] = mapped_column(
        SQLEnum(FeatureStatus),
        default=FeatureStatus.DRAFT,
    )
    priority: Mapped[FeaturePriority] = mapped_column(
        SQLEnum(FeaturePriority),
        default=FeaturePriority.MEDIUM,
    )
    tags: Mapped[List[str]] = mapped_column(ARRAY(String), default=list)

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="features")

    __table_args__ = (
        Index("ix_features_project_status", "project_id", "status"),
        Index("ix_features_project_priority", "project_id", "priority"),
    )
