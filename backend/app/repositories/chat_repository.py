from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .base import BaseRepository
from app.models.chat_message import ChatMessage


class ChatRepository(BaseRepository[ChatMessage]):
    """Repository for ChatMessage operations."""

    def __init__(self, session: AsyncSession):
        super().__init__(ChatMessage, session)

    async def get_project_messages(
        self,
        project_id: str,
        skip: int = 0,
        limit: int = 100,
    ) -> List[ChatMessage]:
        """Get chat messages for a project (excluding diagram-specific messages)."""
        result = await self.session.execute(
            select(ChatMessage)
            .where(ChatMessage.project_id == project_id)
            .where(ChatMessage.diagram_id.is_(None))
            .order_by(ChatMessage.timestamp.asc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_diagram_messages(
        self,
        project_id: str,
        diagram_id: str,
        skip: int = 0,
        limit: int = 100,
    ) -> List[ChatMessage]:
        """Get chat messages for a specific diagram."""
        result = await self.session.execute(
            select(ChatMessage)
            .where(ChatMessage.project_id == project_id)
            .where(ChatMessage.diagram_id == diagram_id)
            .order_by(ChatMessage.timestamp.asc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def add_message(
        self,
        project_id: str,
        role: str,
        content: str,
        diagram_id: Optional[str] = None,
        message_type: str = "text",
        status: str = "complete",
        extra_data: Optional[dict] = None,
    ) -> ChatMessage:
        """Add a new chat message."""
        from app.models.chat_message import MessageRole, MessageType, MessageStatus

        return await self.create(
            project_id=project_id,
            diagram_id=diagram_id,
            role=MessageRole(role),
            content=content,
            message_type=MessageType(message_type),
            status=MessageStatus(status),
            extra_data=extra_data or {},
        )

    async def clear_project_messages(self, project_id: str) -> int:
        """Delete all messages for a project."""
        result = await self.session.execute(
            select(ChatMessage)
            .where(ChatMessage.project_id == project_id)
            .where(ChatMessage.diagram_id.is_(None))
        )
        messages = list(result.scalars().all())
        count = len(messages)

        for message in messages:
            await self.session.delete(message)

        await self.session.flush()
        return count

    async def clear_diagram_messages(
        self,
        project_id: str,
        diagram_id: str,
    ) -> int:
        """Delete all messages for a specific diagram."""
        result = await self.session.execute(
            select(ChatMessage)
            .where(ChatMessage.project_id == project_id)
            .where(ChatMessage.diagram_id == diagram_id)
        )
        messages = list(result.scalars().all())
        count = len(messages)

        for message in messages:
            await self.session.delete(message)

        await self.session.flush()
        return count
