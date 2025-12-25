from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.repositories.project_repository import ProjectRepository
from app.repositories.diagram_repository import DiagramRepository
from app.schemas.diagram import (
    DiagramCreate,
    DiagramUpdate,
    DiagramResponse,
    DiagramListResponse,
)
from app.models.diagram_entity import DiagramType

router = APIRouter(prefix="/projects/{project_id}", tags=["Visualizations"])


async def verify_project_exists(
    project_id: str,
    db: AsyncSession,
) -> None:
    """Verify that the project exists."""
    repo = ProjectRepository(db)
    project = await repo.get_by_id(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")


@router.post("/diagrams", response_model=DiagramResponse, status_code=201)
async def create_diagram(
    project_id: str,
    diagram: DiagramCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new diagram within a project."""
    await verify_project_exists(project_id, db)

    repo = DiagramRepository(db)
    return await repo.create(
        project_id=project_id,
        **diagram.model_dump(),
    )


@router.get("/diagrams", response_model=List[DiagramListResponse])
async def list_diagrams(
    project_id: str,
    diagram_type: Optional[DiagramType] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List all diagrams for a project."""
    await verify_project_exists(project_id, db)

    repo = DiagramRepository(db)
    diagrams = await repo.get_by_project(
        project_id,
        diagram_type=diagram_type,
        skip=skip,
        limit=limit,
    )

    return [
        DiagramListResponse(
            id=d.id,
            name=d.name,
            description=d.description,
            diagram_type=d.diagram_type,
            thumbnail=d.thumbnail,
            version=d.version,
            created_at=d.created_at,
            updated_at=d.updated_at,
        )
        for d in diagrams
    ]


@router.get("/diagrams/{diagram_id}", response_model=DiagramResponse)
async def get_diagram(
    project_id: str,
    diagram_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific diagram."""
    repo = DiagramRepository(db)
    diagram = await repo.get_by_id(diagram_id)

    if not diagram or diagram.project_id != project_id:
        raise HTTPException(status_code=404, detail="Diagram not found")

    return diagram


@router.patch("/diagrams/{diagram_id}", response_model=DiagramResponse)
async def update_diagram(
    project_id: str,
    diagram_id: str,
    updates: DiagramUpdate,
    create_version: bool = Query(
        False,
        description="Create new version instead of updating in place",
    ),
    db: AsyncSession = Depends(get_db),
):
    """Update a diagram or create a new version."""
    repo = DiagramRepository(db)
    diagram = await repo.get_by_id(diagram_id)

    if not diagram or diagram.project_id != project_id:
        raise HTTPException(status_code=404, detail="Diagram not found")

    if create_version and updates.data:
        return await repo.create_new_version(diagram_id, updates.data)

    return await repo.update(diagram_id, **updates.model_dump(exclude_unset=True))


@router.delete("/diagrams/{diagram_id}", status_code=204)
async def delete_diagram(
    project_id: str,
    diagram_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete a diagram."""
    repo = DiagramRepository(db)
    diagram = await repo.get_by_id(diagram_id)

    if not diagram or diagram.project_id != project_id:
        raise HTTPException(status_code=404, detail="Diagram not found")

    await repo.delete(diagram_id)


@router.get("/diagrams/{diagram_id}/versions", response_model=List[DiagramListResponse])
async def get_diagram_versions(
    project_id: str,
    diagram_id: str,
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Get version history for a diagram."""
    repo = DiagramRepository(db)
    diagram = await repo.get_by_id(diagram_id)

    if not diagram or diagram.project_id != project_id:
        raise HTTPException(status_code=404, detail="Diagram not found")

    versions = await repo.get_version_history(diagram_id, limit=limit)

    return [
        DiagramListResponse(
            id=d.id,
            name=d.name,
            description=d.description,
            diagram_type=d.diagram_type,
            thumbnail=d.thumbnail,
            version=d.version,
            created_at=d.created_at,
            updated_at=d.updated_at,
        )
        for d in versions
    ]
