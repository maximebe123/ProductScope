import enum
from typing import List, Optional, TYPE_CHECKING

from sqlalchemy import String, Text, ForeignKey, Enum as SQLEnum, Index
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from .base import UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from .project import Project


class KPIStatus(str, enum.Enum):
    DRAFT = "draft"
    DEFINED = "defined"
    TRACKING = "tracking"
    ARCHIVED = "archived"


class KPIPriority(str, enum.Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class KPICategory(str, enum.Enum):
    EFFICIENCY = "efficiency"       # Time savings, automation
    QUALITY = "quality"             # Accuracy, error reduction
    ADOPTION = "adoption"           # Engagement, feature usage
    REVENUE = "revenue"             # Conversion, ARPU, LTV
    SATISFACTION = "satisfaction"   # NPS, retention, churn
    GROWTH = "growth"               # User growth, market expansion
    OPERATIONAL = "operational"     # Process metrics, throughput


class KPI(Base, UUIDMixin, TimestampMixin):
    """Stores business KPI definitions for project valorization."""
    __tablename__ = "kpis"

    project_id: Mapped[str] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    definition: Mapped[str] = mapped_column(Text, nullable=False)

    # KPI structure
    category: Mapped[KPICategory] = mapped_column(
        SQLEnum(KPICategory),
        default=KPICategory.EFFICIENCY,
    )
    calculation_method: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    data_sources: Mapped[List[str]] = mapped_column(JSONB, default=list)
    unit: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    frequency: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Business context
    target_guidance: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    business_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    impact_areas: Mapped[List[str]] = mapped_column(JSONB, default=list)

    # Technical details
    technical_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Metadata
    status: Mapped[KPIStatus] = mapped_column(
        SQLEnum(KPIStatus),
        default=KPIStatus.DRAFT,
    )
    priority: Mapped[KPIPriority] = mapped_column(
        SQLEnum(KPIPriority),
        default=KPIPriority.MEDIUM,
    )
    tags: Mapped[List[str]] = mapped_column(ARRAY(String), default=list)

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="kpis")

    __table_args__ = (
        Index("ix_kpis_project_status", "project_id", "status"),
        Index("ix_kpis_project_category", "project_id", "category"),
        Index("ix_kpis_project_priority", "project_id", "priority"),
    )
