from datetime import datetime
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .base import BaseRepository
from app.models.question import Question, QuestionStatus


class QuestionRepository(BaseRepository[Question]):
    """Repository for Question operations."""

    def __init__(self, session: AsyncSession):
        super().__init__(Question, session)

    async def get_by_project(
        self,
        project_id: str,
        status: Optional[QuestionStatus] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Question]:
        """Get questions for a project with optional filtering."""
        query = select(Question).where(Question.project_id == project_id)

        if status:
            query = query.where(Question.status == status)

        query = query.order_by(Question.created_at.desc())
        query = query.offset(skip).limit(limit)

        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_open_questions(
        self,
        project_id: str,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Question]:
        """Get open questions for a project."""
        return await self.get_by_project(
            project_id,
            status=QuestionStatus.OPEN,
            skip=skip,
            limit=limit,
        )

    async def answer_question(
        self,
        question_id: str,
        answer: str,
        answered_by: Optional[str] = None,
    ) -> Optional[Question]:
        """Mark a question as answered."""
        return await self.update(
            question_id,
            answer=answer,
            answered_by=answered_by,
            answered_at=datetime.utcnow(),
            status=QuestionStatus.ANSWERED,
        )
