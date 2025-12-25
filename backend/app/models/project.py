import enum
from typing import List, Optional, TYPE_CHECKING

from sqlalchemy import String, Text, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from .base import UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from .transcript import Transcript
    from .story import Story
    from .question import Question
    from .decision import Decision
    from .feature import Feature
    from .kpi import KPI
    from .user_journey import UserJourney
    from .diagram_entity import DiagramEntity
    from .chat_message import ChatMessage
    from .export_record import Export
    from .activity import Activity


class ProjectStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"
    COMPLETED = "completed"


class Project(Base, UUIDMixin, TimestampMixin):
    """Central entity for organizing all project artifacts."""
    __tablename__ = "projects"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[ProjectStatus] = mapped_column(
        SQLEnum(ProjectStatus),
        default=ProjectStatus.DRAFT,
        nullable=False,
    )
    tags: Mapped[List[str]] = mapped_column(ARRAY(String), default=list)
    external_refs: Mapped[dict] = mapped_column(JSONB, default=dict)

    # Relationships
    transcripts: Mapped[List["Transcript"]] = relationship(
        "Transcript", back_populates="project", cascade="all, delete-orphan"
    )
    stories: Mapped[List["Story"]] = relationship(
        "Story", back_populates="project", cascade="all, delete-orphan"
    )
    questions: Mapped[List["Question"]] = relationship(
        "Question", back_populates="project", cascade="all, delete-orphan"
    )
    decisions: Mapped[List["Decision"]] = relationship(
        "Decision", back_populates="project", cascade="all, delete-orphan"
    )
    features: Mapped[List["Feature"]] = relationship(
        "Feature", back_populates="project", cascade="all, delete-orphan"
    )
    kpis: Mapped[List["KPI"]] = relationship(
        "KPI", back_populates="project", cascade="all, delete-orphan"
    )
    user_journeys: Mapped[List["UserJourney"]] = relationship(
        "UserJourney", back_populates="project", cascade="all, delete-orphan"
    )
    diagrams: Mapped[List["DiagramEntity"]] = relationship(
        "DiagramEntity", back_populates="project", cascade="all, delete-orphan"
    )
    chat_messages: Mapped[List["ChatMessage"]] = relationship(
        "ChatMessage", back_populates="project", cascade="all, delete-orphan"
    )
    exports: Mapped[List["Export"]] = relationship(
        "Export", back_populates="project", cascade="all, delete-orphan"
    )
    activities: Mapped[List["Activity"]] = relationship(
        "Activity", back_populates="project", cascade="all, delete-orphan"
    )
