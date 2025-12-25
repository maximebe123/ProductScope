from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.repositories.project_repository import ProjectRepository
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectListResponse,
    ProjectDetailResponse,
)
from app.schemas.common import PaginatedResponse
from app.models.project import ProjectStatus

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.post("/", response_model=ProjectResponse, status_code=201)
async def create_project(
    project: ProjectCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new project."""
    repo = ProjectRepository(db)
    return await repo.create(**project.model_dump())


@router.get("/", response_model=PaginatedResponse[ProjectListResponse])
async def list_projects(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[ProjectStatus] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """List all projects with pagination and filtering."""
    repo = ProjectRepository(db)
    skip = (page - 1) * page_size

    filters = {}
    if status:
        filters["status"] = status

    if search:
        projects = await repo.search(search, skip=skip, limit=page_size)
        # For search, we need to count differently
        all_search_results = await repo.search(search, skip=0, limit=10000)
        total = len(all_search_results)
    else:
        projects = await repo.get_all(skip=skip, limit=page_size, filters=filters)
        total = await repo.count(filters)

    # Get counts for all projects
    project_ids = [p.id for p in projects]
    counts = await repo.get_counts_for_projects(project_ids)

    # Build response with counts
    items = []
    for project in projects:
        project_counts = counts.get(project.id, {})
        item = ProjectListResponse(
            id=project.id,
            name=project.name,
            description=project.description,
            status=project.status,
            tags=project.tags,
            created_at=project.created_at,
            updated_at=project.updated_at,
            story_count=project_counts.get("story_count", 0),
            diagram_count=project_counts.get("diagram_count", 0),
            question_count=project_counts.get("question_count", 0),
            decision_count=project_counts.get("decision_count", 0),
            transcript_count=project_counts.get("transcript_count", 0),
        )
        items.append(item)

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size if total > 0 else 0,
    )


@router.get("/{project_id}", response_model=ProjectDetailResponse)
async def get_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get project details."""
    repo = ProjectRepository(db)
    result = await repo.get_with_counts(project_id)

    if not result:
        raise HTTPException(status_code=404, detail="Project not found")

    project = result["project"]
    return ProjectDetailResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        status=project.status,
        tags=project.tags,
        external_refs=project.external_refs,
        created_at=project.created_at,
        updated_at=project.updated_at,
        story_count=result["story_count"],
        diagram_count=result["diagram_count"],
        question_count=result["question_count"],
        decision_count=result["decision_count"],
        transcript_count=result["transcript_count"],
    )


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    updates: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a project."""
    repo = ProjectRepository(db)
    project = await repo.update(project_id, **updates.model_dump(exclude_unset=True))

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return project


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete a project and all related entities."""
    repo = ProjectRepository(db)
    deleted = await repo.delete(project_id)

    if not deleted:
        raise HTTPException(status_code=404, detail="Project not found")
