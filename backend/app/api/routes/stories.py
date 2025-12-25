"""API routes for Stories."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.repositories.project_repository import ProjectRepository
from app.repositories.story_repository import StoryRepository
from app.models.story import StoryStatus, StoryPriority
from app.schemas.story import (
    StoryCreate,
    StoryUpdate,
    StoryResponse,
)

router = APIRouter(tags=["Stories"])


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
    "/projects/{project_id}/stories",
    response_model=List[StoryResponse],
)
async def list_stories(
    project_id: str,
    status: Optional[StoryStatus] = Query(None),
    priority: Optional[StoryPriority] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """List all stories in a project."""
    await verify_project_exists(project_id, db)

    repo = StoryRepository(db)
    stories = await repo.get_by_project(
        project_id,
        status=status,
        priority=priority,
        skip=skip,
        limit=limit,
    )
    return stories


@router.get(
    "/projects/{project_id}/stories/{story_id}",
    response_model=StoryResponse,
)
async def get_story(
    project_id: str,
    story_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific story."""
    await verify_project_exists(project_id, db)

    repo = StoryRepository(db)
    story = await repo.get_by_id(story_id)

    if not story or story.project_id != project_id:
        raise HTTPException(status_code=404, detail="Story not found")

    return story


@router.post(
    "/projects/{project_id}/stories",
    response_model=StoryResponse,
    status_code=201,
)
async def create_story(
    project_id: str,
    story: StoryCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new story in a project."""
    await verify_project_exists(project_id, db)

    repo = StoryRepository(db)
    return await repo.create(
        project_id=project_id,
        title=story.title,
        as_a=story.as_a,
        i_want=story.i_want,
        so_that=story.so_that,
        acceptance_criteria=story.acceptance_criteria,
        story_type=story.story_type,
        priority=story.priority,
        story_points=story.story_points,
        tags=story.tags,
        source_transcript_id=story.source_transcript_id,
    )


@router.patch(
    "/projects/{project_id}/stories/{story_id}",
    response_model=StoryResponse,
)
async def update_story(
    project_id: str,
    story_id: str,
    story_update: StoryUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a story."""
    await verify_project_exists(project_id, db)

    repo = StoryRepository(db)
    story = await repo.get_by_id(story_id)

    if not story or story.project_id != project_id:
        raise HTTPException(status_code=404, detail="Story not found")

    update_data = story_update.model_dump(exclude_unset=True)
    updated = await repo.update(story_id, **update_data)

    if not updated:
        raise HTTPException(status_code=404, detail="Story not found")

    return updated


@router.delete(
    "/projects/{project_id}/stories/{story_id}",
    status_code=204,
)
async def delete_story(
    project_id: str,
    story_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete a story."""
    await verify_project_exists(project_id, db)

    repo = StoryRepository(db)
    story = await repo.get_by_id(story_id)

    if not story or story.project_id != project_id:
        raise HTTPException(status_code=404, detail="Story not found")

    await repo.delete(story_id)


@router.post(
    "/projects/{project_id}/stories/bulk-status",
    response_model=dict,
)
async def bulk_update_status(
    project_id: str,
    story_ids: List[str],
    status: StoryStatus,
    db: AsyncSession = Depends(get_db),
):
    """Update status for multiple stories."""
    await verify_project_exists(project_id, db)

    repo = StoryRepository(db)
    count = await repo.bulk_update_status(story_ids, status)

    return {"updated": count}
