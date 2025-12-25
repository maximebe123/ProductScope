from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.repositories.project_repository import ProjectRepository
from app.repositories.diagram_repository import DiagramRepository
from app.repositories.chat_repository import ChatRepository
from app.schemas.chat import (
    ChatMessageCreate,
    ChatMessageResponse,
    ChatHistoryResponse,
)

router = APIRouter(tags=["Chat"])


async def verify_project_exists(
    project_id: str,
    db: AsyncSession,
) -> None:
    """Verify that the project exists."""
    repo = ProjectRepository(db)
    project = await repo.get_by_id(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")


async def verify_diagram_exists(
    project_id: str,
    diagram_id: str,
    db: AsyncSession,
) -> None:
    """Verify that the diagram exists in the project."""
    repo = DiagramRepository(db)
    diagram = await repo.get_by_id(diagram_id)
    if not diagram or diagram.project_id != project_id:
        raise HTTPException(status_code=404, detail="Diagram not found")


# Project-level chat


@router.get(
    "/projects/{project_id}/chat",
    response_model=ChatHistoryResponse,
)
async def get_project_chat(
    project_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """Get chat history for a project."""
    await verify_project_exists(project_id, db)

    repo = ChatRepository(db)
    messages = await repo.get_project_messages(project_id, skip=skip, limit=limit)

    return ChatHistoryResponse(
        messages=[ChatMessageResponse.model_validate(m) for m in messages],
        total=len(messages),
    )


@router.post(
    "/projects/{project_id}/chat",
    response_model=ChatMessageResponse,
    status_code=201,
)
async def add_project_message(
    project_id: str,
    message: ChatMessageCreate,
    db: AsyncSession = Depends(get_db),
):
    """Add a chat message to a project."""
    await verify_project_exists(project_id, db)

    repo = ChatRepository(db)
    return await repo.add_message(
        project_id=project_id,
        role=message.role.value,
        content=message.content,
        message_type=message.message_type.value,
        status=message.status.value,
        extra_data=message.extra_data,
    )


@router.delete("/projects/{project_id}/chat", status_code=204)
async def clear_project_chat(
    project_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Clear all chat messages for a project."""
    await verify_project_exists(project_id, db)

    repo = ChatRepository(db)
    await repo.clear_project_messages(project_id)


# Diagram-level chat


@router.get(
    "/projects/{project_id}/diagrams/{diagram_id}/chat",
    response_model=ChatHistoryResponse,
)
async def get_diagram_chat(
    project_id: str,
    diagram_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """Get chat history for a specific diagram."""
    await verify_diagram_exists(project_id, diagram_id, db)

    repo = ChatRepository(db)
    messages = await repo.get_diagram_messages(
        project_id,
        diagram_id,
        skip=skip,
        limit=limit,
    )

    return ChatHistoryResponse(
        messages=[ChatMessageResponse.model_validate(m) for m in messages],
        total=len(messages),
    )


@router.post(
    "/projects/{project_id}/diagrams/{diagram_id}/chat",
    response_model=ChatMessageResponse,
    status_code=201,
)
async def add_diagram_message(
    project_id: str,
    diagram_id: str,
    message: ChatMessageCreate,
    db: AsyncSession = Depends(get_db),
):
    """Add a chat message to a diagram."""
    await verify_diagram_exists(project_id, diagram_id, db)

    repo = ChatRepository(db)
    return await repo.add_message(
        project_id=project_id,
        diagram_id=diagram_id,
        role=message.role.value,
        content=message.content,
        message_type=message.message_type.value,
        status=message.status.value,
        extra_data=message.extra_data,
    )


@router.delete(
    "/projects/{project_id}/diagrams/{diagram_id}/chat",
    status_code=204,
)
async def clear_diagram_chat(
    project_id: str,
    diagram_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Clear all chat messages for a diagram."""
    await verify_diagram_exists(project_id, diagram_id, db)

    repo = ChatRepository(db)
    await repo.clear_diagram_messages(project_id, diagram_id)
