import enum
from datetime import datetime
from typing import List, Optional, TYPE_CHECKING

from sqlalchemy import String, Text, ForeignKey, Enum as SQLEnum, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from .base import UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from .project import Project


class ExportDestination(str, enum.Enum):
    JIRA = "jira"
    CONFLUENCE = "confluence"
    AZURE_DEVOPS = "azure_devops"
    LINEAR = "linear"
    NOTION = "notion"
    GITHUB = "github"
    JSON = "json"
    PDF = "pdf"
    CSV = "csv"


class ExportStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    PARTIAL = "partial"


class Export(Base, UUIDMixin, TimestampMixin):
    """Audit trail for exports to external systems."""
    __tablename__ = "exports"

    project_id: Mapped[str] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    destination: Mapped[ExportDestination] = mapped_column(
        SQLEnum(ExportDestination),
        nullable=False,
    )
    status: Mapped[ExportStatus] = mapped_column(
        SQLEnum(ExportStatus),
        default=ExportStatus.PENDING,
    )

    # What was exported
    exported_items: Mapped[List[dict]] = mapped_column(JSONB, default=list)
    # Format: [{"type": "story", "id": "...", "external_ref": "PROJ-456"}]

    # Export configuration
    export_config: Mapped[dict] = mapped_column(JSONB, default=dict)
    # Config: {"target_project": "...", "labels": [...], "sprint": "..."}

    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="exports")
