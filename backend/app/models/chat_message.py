import enum
from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import String, Text, ForeignKey, Enum as SQLEnum, Index, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from .base import UUIDMixin

if TYPE_CHECKING:
    from .project import Project
    from .diagram_entity import DiagramEntity


class MessageRole(str, enum.Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class MessageType(str, enum.Enum):
    TEXT = "text"
    ACTION = "action"
    ERROR = "error"


class MessageStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETE = "complete"
    ERROR = "error"


class ChatMessage(Base, UUIDMixin):
    """Stores AI chat history linked to projects or diagrams."""
    __tablename__ = "chat_messages"

    # Polymorphic context - linked to project OR diagram
    project_id: Mapped[str] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    diagram_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("diagrams.id", ondelete="CASCADE"),
        nullable=True,
    )

    # Message content
    role: Mapped[MessageRole] = mapped_column(
        SQLEnum(MessageRole),
        nullable=False,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    message_type: Mapped[MessageType] = mapped_column(
        SQLEnum(MessageType),
        default=MessageType.TEXT,
        nullable=False,
    )

    # Status and extra data
    status: Mapped[MessageStatus] = mapped_column(
        SQLEnum(MessageStatus),
        default=MessageStatus.COMPLETE,
        nullable=False,
    )
    extra_data: Mapped[dict] = mapped_column(JSONB, default=dict)
    # extra_data: {tokens_used, model, duration_ms, etc.}

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="chat_messages")
    diagram: Mapped[Optional["DiagramEntity"]] = relationship(
        "DiagramEntity",
        back_populates="chat_messages",
        foreign_keys=[diagram_id],
    )

    __table_args__ = (
        Index("ix_chat_project_time", "project_id", "timestamp"),
        Index("ix_chat_diagram_time", "diagram_id", "timestamp"),
    )
