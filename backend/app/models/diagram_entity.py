import enum
from typing import Optional, List, TYPE_CHECKING

from sqlalchemy import String, Text, Integer, ForeignKey, Enum as SQLEnum, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from .base import UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from .project import Project
    from .chat_message import ChatMessage


class DiagramType(str, enum.Enum):
    ARCHITECTURE = "architecture"  # ReactFlow diagrams
    MINDMAP = "mindmap"            # MindElixir
    FLOWCHART = "flowchart"        # Mermaid
    JOURNEY = "journey"            # User journey maps
    STORYMAP = "storymap"          # Story mapping


class DiagramEntity(Base, UUIDMixin, TimestampMixin):
    """Stores all types of diagrams with flexible JSONB data."""
    __tablename__ = "diagrams"

    project_id: Mapped[str] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    diagram_type: Mapped[DiagramType] = mapped_column(
        SQLEnum(DiagramType),
        nullable=False,
    )

    # The actual diagram data stored as JSONB
    # For architecture: {nodes: [...], edges: [...], viewport: {...}}
    # For mindmap: MindElixirData format
    # For flowchart: {mermaidCode: "...", parsedNodes: [...], parsedEdges: [...]}
    data: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    # Thumbnail for quick preview (base64 PNG or URL)
    thumbnail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Version control
    version: Mapped[int] = mapped_column(Integer, default=1)
    parent_version_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("diagrams.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="diagrams")
    chat_messages: Mapped[List["ChatMessage"]] = relationship(
        "ChatMessage",
        back_populates="diagram",
        cascade="all, delete-orphan",
        foreign_keys="ChatMessage.diagram_id",
    )

    __table_args__ = (
        Index("ix_diagrams_project_type", "project_id", "diagram_type"),
    )
