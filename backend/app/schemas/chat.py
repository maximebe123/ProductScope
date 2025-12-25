from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel

from app.models.chat_message import MessageRole, MessageType, MessageStatus


class ChatMessageCreate(BaseModel):
    """Schema for creating a chat message."""

    role: MessageRole
    content: str
    message_type: MessageType = MessageType.TEXT
    status: MessageStatus = MessageStatus.COMPLETE
    extra_data: dict = {}


class ChatMessageResponse(BaseModel):
    """Schema for chat message response."""

    id: str
    project_id: str
    diagram_id: Optional[str] = None
    role: MessageRole
    content: str
    message_type: MessageType
    status: MessageStatus
    extra_data: dict
    timestamp: datetime

    class Config:
        from_attributes = True


class ChatHistoryResponse(BaseModel):
    """Schema for chat history response."""

    messages: List[ChatMessageResponse]
    total: int
