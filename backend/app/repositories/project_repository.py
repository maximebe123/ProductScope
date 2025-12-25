from typing import List, Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .base import BaseRepository
from app.models.project import Project, ProjectStatus


class ProjectRepository(BaseRepository[Project]):
    """Repository for Project operations."""

    def __init__(self, session: AsyncSession):
        super().__init__(Project, session)

    async def get_with_relations(self, id: str) -> Optional[Project]:
        """Get project with all related entities loaded."""
        result = await self.session.execute(
            select(Project)
            .where(Project.id == id)
            .options(
                selectinload(Project.stories),
                selectinload(Project.diagrams),
                selectinload(Project.questions),
                selectinload(Project.decisions),
                selectinload(Project.transcripts),
            )
        )
        return result.scalar_one_or_none()

    async def get_by_status(
        self,
        status: ProjectStatus,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Project]:
        """Get projects by status."""
        result = await self.session.execute(
            select(Project)
            .where(Project.status == status)
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def search(
        self,
        query: str,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Project]:
        """Full-text search on name and description."""
        result = await self.session.execute(
            select(Project)
            .where(
                Project.name.ilike(f"%{query}%")
                | Project.description.ilike(f"%{query}%")
            )
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_with_counts(self, id: str) -> Optional[dict]:
        """Get project with entity counts."""
        project = await self.get_by_id(id)
        if not project:
            return None

        # Get counts for each related entity type
        from app.models import Story, DiagramEntity, Question, Decision, Transcript

        story_count = await self.session.scalar(
            select(func.count()).select_from(Story).where(Story.project_id == id)
        )
        diagram_count = await self.session.scalar(
            select(func.count())
            .select_from(DiagramEntity)
            .where(DiagramEntity.project_id == id)
        )
        question_count = await self.session.scalar(
            select(func.count()).select_from(Question).where(Question.project_id == id)
        )
        decision_count = await self.session.scalar(
            select(func.count()).select_from(Decision).where(Decision.project_id == id)
        )
        transcript_count = await self.session.scalar(
            select(func.count())
            .select_from(Transcript)
            .where(Transcript.project_id == id)
        )

        return {
            "project": project,
            "story_count": story_count or 0,
            "diagram_count": diagram_count or 0,
            "question_count": question_count or 0,
            "decision_count": decision_count or 0,
            "transcript_count": transcript_count or 0,
        }

    async def get_counts_for_projects(self, project_ids: List[str]) -> dict:
        """Get entity counts for multiple projects."""
        from app.models import Story, DiagramEntity, Question, Decision, Transcript

        if not project_ids:
            return {}

        # Get counts grouped by project_id
        story_result = await self.session.execute(
            select(Story.project_id, func.count())
            .where(Story.project_id.in_(project_ids))
            .group_by(Story.project_id)
        )
        story_counts = {row[0]: row[1] for row in story_result.all()}

        diagram_result = await self.session.execute(
            select(DiagramEntity.project_id, func.count())
            .where(DiagramEntity.project_id.in_(project_ids))
            .group_by(DiagramEntity.project_id)
        )
        diagram_counts = {row[0]: row[1] for row in diagram_result.all()}

        question_result = await self.session.execute(
            select(Question.project_id, func.count())
            .where(Question.project_id.in_(project_ids))
            .group_by(Question.project_id)
        )
        question_counts = {row[0]: row[1] for row in question_result.all()}

        decision_result = await self.session.execute(
            select(Decision.project_id, func.count())
            .where(Decision.project_id.in_(project_ids))
            .group_by(Decision.project_id)
        )
        decision_counts = {row[0]: row[1] for row in decision_result.all()}

        transcript_result = await self.session.execute(
            select(Transcript.project_id, func.count())
            .where(Transcript.project_id.in_(project_ids))
            .group_by(Transcript.project_id)
        )
        transcript_counts = {row[0]: row[1] for row in transcript_result.all()}

        result = {}
        for pid in project_ids:
            result[pid] = {
                "story_count": story_counts.get(pid, 0),
                "diagram_count": diagram_counts.get(pid, 0),
                "question_count": question_counts.get(pid, 0),
                "decision_count": decision_counts.get(pid, 0),
                "transcript_count": transcript_counts.get(pid, 0),
            }
        return result
