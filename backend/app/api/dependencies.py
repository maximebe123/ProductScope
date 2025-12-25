"""
API Dependencies

Reusable FastAPI dependencies for route handlers.
Centralizes common patterns like project verification.
"""

from typing import Annotated
from fastapi import Depends, HTTPException, Path
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.repositories.project_repository import ProjectRepository
from app.models.project import Project


async def get_project_or_404(
    project_id: Annotated[str, Path(description="The project ID")],
    db: AsyncSession = Depends(get_db),
) -> Project:
    """
    Get a project by ID or raise 404.

    Usage:
        @router.get("/projects/{project_id}/features")
        async def list_features(
            project: Project = Depends(get_project_or_404),
            db: AsyncSession = Depends(get_db),
        ):
            # project is guaranteed to exist
            ...
    """
    repo = ProjectRepository(db)
    project = await repo.get_by_id(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


# Type alias for cleaner route signatures
RequireProject = Annotated[Project, Depends(get_project_or_404)]


async def verify_project_exists(
    project_id: str,
    db: AsyncSession,
) -> None:
    """
    Verify that a project exists (for backward compatibility).

    Prefer using get_project_or_404 as a dependency instead.
    This function is kept for routes that don't need the project object.
    """
    repo = ProjectRepository(db)
    project = await repo.get_by_id(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
