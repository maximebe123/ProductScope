"""API routes for Decisions."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.repositories.project_repository import ProjectRepository
from app.repositories.decision_repository import DecisionRepository
from app.models.decision import DecisionStatus
from app.schemas.decision import (
    DecisionCreate,
    DecisionUpdate,
    DecisionResponse,
)

router = APIRouter(tags=["Decisions"])


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
    "/projects/{project_id}/decisions",
    response_model=List[DecisionResponse],
)
async def list_decisions(
    project_id: str,
    status: Optional[DecisionStatus] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """List all decisions in a project."""
    await verify_project_exists(project_id, db)

    repo = DecisionRepository(db)
    decisions = await repo.get_by_project(
        project_id,
        status=status,
        skip=skip,
        limit=limit,
    )
    return decisions


@router.get(
    "/projects/{project_id}/decisions/{decision_id}",
    response_model=DecisionResponse,
)
async def get_decision(
    project_id: str,
    decision_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific decision."""
    await verify_project_exists(project_id, db)

    repo = DecisionRepository(db)
    decision = await repo.get_by_id(decision_id)

    if not decision or decision.project_id != project_id:
        raise HTTPException(status_code=404, detail="Decision not found")

    return decision


@router.post(
    "/projects/{project_id}/decisions",
    response_model=DecisionResponse,
    status_code=201,
)
async def create_decision(
    project_id: str,
    decision: DecisionCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new decision in a project."""
    await verify_project_exists(project_id, db)

    repo = DecisionRepository(db)
    return await repo.create(
        project_id=project_id,
        title=decision.title,
        description=decision.description,
        rationale=decision.rationale,
        alternatives=[alt.model_dump() for alt in decision.alternatives],
        affected_areas=decision.affected_areas,
    )


@router.patch(
    "/projects/{project_id}/decisions/{decision_id}",
    response_model=DecisionResponse,
)
async def update_decision(
    project_id: str,
    decision_id: str,
    decision_update: DecisionUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a decision."""
    await verify_project_exists(project_id, db)

    repo = DecisionRepository(db)
    decision = await repo.get_by_id(decision_id)

    if not decision or decision.project_id != project_id:
        raise HTTPException(status_code=404, detail="Decision not found")

    update_data = decision_update.model_dump(exclude_unset=True)

    # Convert alternatives if present
    if "alternatives" in update_data and update_data["alternatives"] is not None:
        update_data["alternatives"] = [
            alt.model_dump() if hasattr(alt, "model_dump") else alt
            for alt in update_data["alternatives"]
        ]

    updated = await repo.update(decision_id, **update_data)

    if not updated:
        raise HTTPException(status_code=404, detail="Decision not found")

    return updated


@router.delete(
    "/projects/{project_id}/decisions/{decision_id}",
    status_code=204,
)
async def delete_decision(
    project_id: str,
    decision_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete a decision."""
    await verify_project_exists(project_id, db)

    repo = DecisionRepository(db)
    decision = await repo.get_by_id(decision_id)

    if not decision or decision.project_id != project_id:
        raise HTTPException(status_code=404, detail="Decision not found")

    await repo.delete(decision_id)


@router.post(
    "/projects/{project_id}/decisions/{decision_id}/approve",
    response_model=DecisionResponse,
)
async def approve_decision(
    project_id: str,
    decision_id: str,
    decided_by: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Mark a decision as approved."""
    await verify_project_exists(project_id, db)

    repo = DecisionRepository(db)
    decision = await repo.get_by_id(decision_id)

    if not decision or decision.project_id != project_id:
        raise HTTPException(status_code=404, detail="Decision not found")

    updated = await repo.approve_decision(decision_id, decided_by=decided_by)
    return updated


@router.post(
    "/projects/{project_id}/decisions/{decision_id}/supersede",
    response_model=DecisionResponse,
)
async def supersede_decision(
    project_id: str,
    decision_id: str,
    new_decision_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Mark a decision as superseded by another."""
    await verify_project_exists(project_id, db)

    repo = DecisionRepository(db)
    decision = await repo.get_by_id(decision_id)

    if not decision or decision.project_id != project_id:
        raise HTTPException(status_code=404, detail="Decision not found")

    # Verify new decision exists
    new_decision = await repo.get_by_id(new_decision_id)
    if not new_decision or new_decision.project_id != project_id:
        raise HTTPException(status_code=404, detail="New decision not found")

    updated = await repo.supersede_decision(decision_id, new_decision_id)
    return updated
