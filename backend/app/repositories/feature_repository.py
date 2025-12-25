from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .base import BaseRepository
from app.models.feature import Feature, FeatureStatus, FeaturePriority


class FeatureRepository(BaseRepository[Feature]):
    """Repository for Feature operations."""

    def __init__(self, session: AsyncSession):
        super().__init__(Feature, session)

    async def get_by_project(
        self,
        project_id: str,
        status: Optional[FeatureStatus] = None,
        priority: Optional[FeaturePriority] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Feature]:
        """Get features for a project with optional filtering."""
        query = select(Feature).where(Feature.project_id == project_id)

        if status:
            query = query.where(Feature.status == status)
        if priority:
            query = query.where(Feature.priority == priority)

        query = query.order_by(Feature.created_at.desc())
        query = query.offset(skip).limit(limit)

        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def update_status(
        self,
        feature_id: str,
        status: FeatureStatus,
    ) -> Optional[Feature]:
        """Update feature status."""
        return await self.update(feature_id, status=status)

    async def count_by_project(self, project_id: str) -> int:
        """Count features in a project using SQL COUNT."""
        return await self.count(filters={"project_id": project_id})
