from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .base import BaseRepository
from app.models.story import Story, StoryStatus, StoryPriority


class StoryRepository(BaseRepository[Story]):
    """Repository for Story operations."""

    def __init__(self, session: AsyncSession):
        super().__init__(Story, session)

    async def get_by_project(
        self,
        project_id: str,
        status: Optional[StoryStatus] = None,
        priority: Optional[StoryPriority] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Story]:
        """Get stories for a project with optional filtering."""
        query = select(Story).where(Story.project_id == project_id)

        if status:
            query = query.where(Story.status == status)
        if priority:
            query = query.where(Story.priority == priority)

        query = query.order_by(Story.created_at.desc())
        query = query.offset(skip).limit(limit)

        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_by_transcript(
        self,
        transcript_id: str,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Story]:
        """Get stories generated from a specific transcript."""
        result = await self.session.execute(
            select(Story)
            .where(Story.source_transcript_id == transcript_id)
            .order_by(Story.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def update_status(
        self,
        story_id: str,
        status: StoryStatus,
    ) -> Optional[Story]:
        """Update story status."""
        return await self.update(story_id, status=status)

    async def bulk_update_status(
        self,
        story_ids: List[str],
        status: StoryStatus,
    ) -> int:
        """Update status for multiple stories."""
        count = 0
        for story_id in story_ids:
            result = await self.update_status(story_id, status)
            if result:
                count += 1
        return count
