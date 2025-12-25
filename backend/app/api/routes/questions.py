"""API routes for Questions."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.repositories.project_repository import ProjectRepository
from app.repositories.question_repository import QuestionRepository
from app.models.question import QuestionStatus
from app.schemas.question import (
    QuestionCreate,
    QuestionUpdate,
    QuestionResponse,
)

router = APIRouter(tags=["Questions"])


async def verify_project_exists(
    project_id: str,
    db: AsyncSession,
) -> None:
    """Verify that the project exists."""
    repo = ProjectRepository(db)
    project = await repo.get_by_id(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")


@router.get(
    "/projects/{project_id}/questions",
    response_model=List[QuestionResponse],
)
async def list_questions(
    project_id: str,
    status: Optional[QuestionStatus] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """List all questions in a project."""
    await verify_project_exists(project_id, db)

    repo = QuestionRepository(db)
    questions = await repo.get_by_project(
        project_id,
        status=status,
        skip=skip,
        limit=limit,
    )
    return questions


@router.get(
    "/projects/{project_id}/questions/{question_id}",
    response_model=QuestionResponse,
)
async def get_question(
    project_id: str,
    question_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific question."""
    await verify_project_exists(project_id, db)

    repo = QuestionRepository(db)
    question = await repo.get_by_id(question_id)

    if not question or question.project_id != project_id:
        raise HTTPException(status_code=404, detail="Question not found")

    return question


@router.post(
    "/projects/{project_id}/questions",
    response_model=QuestionResponse,
    status_code=201,
)
async def create_question(
    project_id: str,
    question: QuestionCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new question in a project."""
    await verify_project_exists(project_id, db)

    repo = QuestionRepository(db)
    return await repo.create(
        project_id=project_id,
        question=question.question,
        context=question.context,
        source_transcript_id=question.source_transcript_id,
    )


@router.patch(
    "/projects/{project_id}/questions/{question_id}",
    response_model=QuestionResponse,
)
async def update_question(
    project_id: str,
    question_id: str,
    question_update: QuestionUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a question."""
    await verify_project_exists(project_id, db)

    repo = QuestionRepository(db)
    question = await repo.get_by_id(question_id)

    if not question or question.project_id != project_id:
        raise HTTPException(status_code=404, detail="Question not found")

    update_data = question_update.model_dump(exclude_unset=True)
    updated = await repo.update(question_id, **update_data)

    if not updated:
        raise HTTPException(status_code=404, detail="Question not found")

    return updated


@router.delete(
    "/projects/{project_id}/questions/{question_id}",
    status_code=204,
)
async def delete_question(
    project_id: str,
    question_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete a question."""
    await verify_project_exists(project_id, db)

    repo = QuestionRepository(db)
    question = await repo.get_by_id(question_id)

    if not question or question.project_id != project_id:
        raise HTTPException(status_code=404, detail="Question not found")

    await repo.delete(question_id)


@router.post(
    "/projects/{project_id}/questions/{question_id}/answer",
    response_model=QuestionResponse,
)
async def answer_question(
    project_id: str,
    question_id: str,
    answer: str,
    answered_by: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Mark a question as answered."""
    await verify_project_exists(project_id, db)

    repo = QuestionRepository(db)
    question = await repo.get_by_id(question_id)

    if not question or question.project_id != project_id:
        raise HTTPException(status_code=404, detail="Question not found")

    updated = await repo.answer_question(
        question_id,
        answer=answer,
        answered_by=answered_by,
    )

    return updated
