from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .base import BaseRepository
from app.models.user_journey import UserJourney, JourneyStatus


class UserJourneyRepository(BaseRepository[UserJourney]):
    """Repository for UserJourney operations."""

    def __init__(self, session: AsyncSession):
        super().__init__(UserJourney, session)

    async def get_by_project(
        self,
        project_id: str,
        status: Optional[JourneyStatus] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[UserJourney]:
        """Get user journeys for a project with optional filtering."""
        query = select(UserJourney).where(UserJourney.project_id == project_id)

        if status:
            query = query.where(UserJourney.status == status)

        query = query.order_by(UserJourney.created_at.desc())
        query = query.offset(skip).limit(limit)

        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def update_status(
        self,
        journey_id: str,
        status: JourneyStatus,
    ) -> Optional[UserJourney]:
        """Update journey status."""
        return await self.update(journey_id, status=status)

    async def count_by_project(self, project_id: str) -> int:
        """Count user journeys in a project."""
        result = await self.session.execute(
            select(UserJourney).where(UserJourney.project_id == project_id)
        )
        return len(list(result.scalars().all()))
