from datetime import datetime
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .base import BaseRepository
from app.models.decision import Decision, DecisionStatus


class DecisionRepository(BaseRepository[Decision]):
    """Repository for Decision operations."""

    def __init__(self, session: AsyncSession):
        super().__init__(Decision, session)

    async def get_by_project(
        self,
        project_id: str,
        status: Optional[DecisionStatus] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Decision]:
        """Get decisions for a project with optional filtering."""
        query = select(Decision).where(Decision.project_id == project_id)

        if status:
            query = query.where(Decision.status == status)

        query = query.order_by(Decision.created_at.desc())
        query = query.offset(skip).limit(limit)

        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def approve_decision(
        self,
        decision_id: str,
        decided_by: Optional[str] = None,
    ) -> Optional[Decision]:
        """Mark a decision as approved."""
        return await self.update(
            decision_id,
            status=DecisionStatus.APPROVED,
            decided_by=decided_by,
            decided_at=datetime.utcnow(),
        )

    async def supersede_decision(
        self,
        decision_id: str,
        new_decision_id: str,
    ) -> Optional[Decision]:
        """Mark a decision as superseded by another."""
        return await self.update(
            decision_id,
            status=DecisionStatus.SUPERSEDED,
            superseded_by_id=new_decision_id,
        )
