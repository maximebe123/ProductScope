"""API routes for Transcripts."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.repositories.project_repository import ProjectRepository
from app.repositories.transcript_repository import TranscriptRepository
from app.models.transcript import TranscriptSource, ProcessingStatus
from app.schemas.transcript import (
    TranscriptCreate,
    TranscriptUpdate,
    TranscriptResponse,
    TranscriptListResponse,
)

router = APIRouter(tags=["Transcripts"])


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
    "/projects/{project_id}/transcripts",
    response_model=List[TranscriptListResponse],
)
async def list_transcripts(
    project_id: str,
    status: Optional[ProcessingStatus] = Query(None),
    source: Optional[TranscriptSource] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """List all transcripts in a project."""
    await verify_project_exists(project_id, db)

    repo = TranscriptRepository(db)
    transcripts = await repo.get_by_project(
        project_id,
        status=status,
        source=source,
        skip=skip,
        limit=limit,
    )
    return transcripts


@router.get(
    "/projects/{project_id}/transcripts/{transcript_id}",
    response_model=TranscriptResponse,
)
async def get_transcript(
    project_id: str,
    transcript_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific transcript with full content."""
    await verify_project_exists(project_id, db)

    repo = TranscriptRepository(db)
    transcript = await repo.get_by_id(transcript_id)

    if not transcript or transcript.project_id != project_id:
        raise HTTPException(status_code=404, detail="Transcript not found")

    return transcript


@router.post(
    "/projects/{project_id}/transcripts",
    response_model=TranscriptResponse,
    status_code=201,
)
async def create_transcript(
    project_id: str,
    transcript: TranscriptCreate,
    db: AsyncSession = Depends(get_db),
):
    """Upload a new transcript to a project."""
    await verify_project_exists(project_id, db)

    repo = TranscriptRepository(db)
    return await repo.create(
        project_id=project_id,
        title=transcript.title,
        source=transcript.source,
        raw_content=transcript.raw_content,
        participants=transcript.participants,
        duration_seconds=transcript.duration_seconds,
        meeting_date=transcript.meeting_date,
        processing_status=ProcessingStatus.PENDING,
    )


@router.patch(
    "/projects/{project_id}/transcripts/{transcript_id}",
    response_model=TranscriptResponse,
)
async def update_transcript(
    project_id: str,
    transcript_id: str,
    transcript_update: TranscriptUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a transcript."""
    await verify_project_exists(project_id, db)

    repo = TranscriptRepository(db)
    transcript = await repo.get_by_id(transcript_id)

    if not transcript or transcript.project_id != project_id:
        raise HTTPException(status_code=404, detail="Transcript not found")

    update_data = transcript_update.model_dump(exclude_unset=True)
    updated = await repo.update(transcript_id, **update_data)

    if not updated:
        raise HTTPException(status_code=404, detail="Transcript not found")

    return updated


@router.delete(
    "/projects/{project_id}/transcripts/{transcript_id}",
    status_code=204,
)
async def delete_transcript(
    project_id: str,
    transcript_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete a transcript."""
    await verify_project_exists(project_id, db)

    repo = TranscriptRepository(db)
    transcript = await repo.get_by_id(transcript_id)

    if not transcript or transcript.project_id != project_id:
        raise HTTPException(status_code=404, detail="Transcript not found")

    await repo.delete(transcript_id)


@router.post(
    "/projects/{project_id}/transcripts/{transcript_id}/process",
    response_model=TranscriptResponse,
)
async def trigger_processing(
    project_id: str,
    transcript_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Trigger AI processing for a transcript."""
    await verify_project_exists(project_id, db)

    repo = TranscriptRepository(db)
    transcript = await repo.get_by_id(transcript_id)

    if not transcript or transcript.project_id != project_id:
        raise HTTPException(status_code=404, detail="Transcript not found")

    # Mark as processing
    updated = await repo.update_processing_status(
        transcript_id,
        ProcessingStatus.PROCESSING,
    )

    # TODO: Trigger actual AI processing asynchronously

    return updated
