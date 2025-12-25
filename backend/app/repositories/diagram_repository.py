from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .base import BaseRepository
from app.models.diagram_entity import DiagramEntity, DiagramType


class DiagramRepository(BaseRepository[DiagramEntity]):
    """Repository for DiagramEntity operations."""

    def __init__(self, session: AsyncSession):
        super().__init__(DiagramEntity, session)

    async def get_by_project(
        self,
        project_id: str,
        diagram_type: Optional[DiagramType] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[DiagramEntity]:
        """Get diagrams for a project, optionally filtered by type."""
        query = select(DiagramEntity).where(DiagramEntity.project_id == project_id)

        if diagram_type:
            query = query.where(DiagramEntity.diagram_type == diagram_type)

        query = query.order_by(DiagramEntity.updated_at.desc())
        query = query.offset(skip).limit(limit)

        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_latest_version(self, id: str) -> Optional[DiagramEntity]:
        """Get the latest version of a diagram."""
        diagram = await self.get_by_id(id)
        if not diagram:
            return None

        # Find the latest version in the version chain
        result = await self.session.execute(
            select(DiagramEntity)
            .where(
                (DiagramEntity.id == id)
                | (DiagramEntity.parent_version_id == id)
            )
            .order_by(DiagramEntity.version.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def create_new_version(
        self,
        parent_id: str,
        new_data: dict,
    ) -> DiagramEntity:
        """Create a new version of an existing diagram."""
        parent = await self.get_by_id(parent_id)
        if not parent:
            raise ValueError(f"Diagram {parent_id} not found")

        return await self.create(
            project_id=parent.project_id,
            name=parent.name,
            description=parent.description,
            diagram_type=parent.diagram_type,
            data=new_data,
            version=parent.version + 1,
            parent_version_id=parent_id,
        )

    async def get_version_history(
        self,
        diagram_id: str,
        limit: int = 10,
    ) -> List[DiagramEntity]:
        """Get version history for a diagram."""
        # Get all versions that share the same root
        result = await self.session.execute(
            select(DiagramEntity)
            .where(
                (DiagramEntity.id == diagram_id)
                | (DiagramEntity.parent_version_id == diagram_id)
            )
            .order_by(DiagramEntity.version.desc())
            .limit(limit)
        )
        return list(result.scalars().all())
