from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .base import BaseRepository
from app.models.kpi import KPI, KPIStatus, KPIPriority, KPICategory


class KPIRepository(BaseRepository[KPI]):
    """Repository for KPI operations."""

    def __init__(self, session: AsyncSession):
        super().__init__(KPI, session)

    async def get_by_project(
        self,
        project_id: str,
        status: Optional[KPIStatus] = None,
        category: Optional[KPICategory] = None,
        priority: Optional[KPIPriority] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[KPI]:
        """Get KPIs for a project with optional filtering."""
        query = select(KPI).where(KPI.project_id == project_id)

        if status:
            query = query.where(KPI.status == status)
        if category:
            query = query.where(KPI.category == category)
        if priority:
            query = query.where(KPI.priority == priority)

        query = query.order_by(KPI.created_at.desc())
        query = query.offset(skip).limit(limit)

        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_top_priority(
        self,
        project_id: str,
        limit: int = 5,
    ) -> List[KPI]:
        """Get top priority KPIs for a project (for overview display)."""
        # Priority order: CRITICAL > HIGH > MEDIUM > LOW
        query = (
            select(KPI)
            .where(KPI.project_id == project_id)
            .where(KPI.status != KPIStatus.ARCHIVED)
            .order_by(
                KPI.priority.desc(),  # This works because CRITICAL > HIGH > etc.
                KPI.created_at.desc(),
            )
            .limit(limit)
        )

        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def update_status(
        self,
        kpi_id: str,
        status: KPIStatus,
    ) -> Optional[KPI]:
        """Update KPI status."""
        return await self.update(kpi_id, status=status)

    async def count_by_project(self, project_id: str) -> int:
        """Count KPIs in a project."""
        result = await self.session.execute(
            select(KPI).where(KPI.project_id == project_id)
        )
        return len(list(result.scalars().all()))

    async def count_by_category(self, project_id: str) -> dict[str, int]:
        """Count KPIs by category for a project."""
        result = await self.session.execute(
            select(KPI).where(KPI.project_id == project_id)
        )
        kpis = list(result.scalars().all())

        counts: dict[str, int] = {}
        for kpi in kpis:
            category = kpi.category.value
            counts[category] = counts.get(category, 0) + 1
        return counts
