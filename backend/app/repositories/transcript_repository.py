from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .base import BaseRepository
from app.models.transcript import Transcript, ProcessingStatus, TranscriptSource


class TranscriptRepository(BaseRepository[Transcript]):
    """Repository for Transcript operations."""

    def __init__(self, session: AsyncSession):
        super().__init__(Transcript, session)

    async def get_by_project(
        self,
        project_id: str,
        status: Optional[ProcessingStatus] = None,
        source: Optional[TranscriptSource] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Transcript]:
        """Get transcripts for a project with optional filtering."""
        query = select(Transcript).where(Transcript.project_id == project_id)

        if status:
            query = query.where(Transcript.processing_status == status)
        if source:
            query = query.where(Transcript.source == source)

        query = query.order_by(Transcript.created_at.desc())
        query = query.offset(skip).limit(limit)

        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_pending(
        self,
        project_id: Optional[str] = None,
        limit: int = 10,
    ) -> List[Transcript]:
        """Get transcripts pending processing."""
        query = select(Transcript).where(
            Transcript.processing_status == ProcessingStatus.PENDING
        )

        if project_id:
            query = query.where(Transcript.project_id == project_id)

        query = query.order_by(Transcript.created_at.asc()).limit(limit)

        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def update_processing_status(
        self,
        transcript_id: str,
        status: ProcessingStatus,
        parsed_content: Optional[dict] = None,
    ) -> Optional[Transcript]:
        """Update transcript processing status."""
        updates = {"processing_status": status}
        if parsed_content is not None:
            updates["parsed_content"] = parsed_content

        return await self.update(transcript_id, **updates)
