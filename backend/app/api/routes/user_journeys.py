"""API routes for User Journeys."""

from typing import List, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.repositories.project_repository import ProjectRepository
from app.repositories.user_journey_repository import UserJourneyRepository
from app.models.user_journey import JourneyStatus
from app.schemas.user_journey import (
    UserJourneyCreate,
    UserJourneyUpdate,
    UserJourneyResponse,
    UserJourneyGenerateRequest,
    UserJourneyGenerateResponse,
)
from app.config import settings

router = APIRouter(tags=["User Journeys"])


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
    "/projects/{project_id}/journeys",
    response_model=List[UserJourneyResponse],
)
async def list_journeys(
    project_id: str,
    status: Optional[JourneyStatus] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """List all user journeys in a project."""
    await verify_project_exists(project_id, db)

    repo = UserJourneyRepository(db)
    journeys = await repo.get_by_project(
        project_id,
        status=status,
        skip=skip,
        limit=limit,
    )
    return journeys


@router.get(
    "/projects/{project_id}/journeys/{journey_id}",
    response_model=UserJourneyResponse,
)
async def get_journey(
    project_id: str,
    journey_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific user journey."""
    await verify_project_exists(project_id, db)

    repo = UserJourneyRepository(db)
    journey = await repo.get_by_id(journey_id)

    if not journey or journey.project_id != project_id:
        raise HTTPException(status_code=404, detail="User journey not found")

    return journey


@router.post(
    "/projects/{project_id}/journeys",
    response_model=UserJourneyResponse,
    status_code=201,
)
async def create_journey(
    project_id: str,
    journey: UserJourneyCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new user journey in a project."""
    await verify_project_exists(project_id, db)

    # Convert Pydantic models to dicts for JSONB storage
    phases_data = [p.model_dump() for p in journey.phases]
    steps_data = [s.model_dump() for s in journey.steps]

    repo = UserJourneyRepository(db)
    return await repo.create(
        project_id=project_id,
        title=journey.title,
        persona=journey.persona,
        description=journey.description,
        phases=phases_data,
        steps=steps_data,
        tags=journey.tags,
    )


@router.patch(
    "/projects/{project_id}/journeys/{journey_id}",
    response_model=UserJourneyResponse,
)
async def update_journey(
    project_id: str,
    journey_id: str,
    journey_update: UserJourneyUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a user journey."""
    await verify_project_exists(project_id, db)

    repo = UserJourneyRepository(db)
    journey = await repo.get_by_id(journey_id)

    if not journey or journey.project_id != project_id:
        raise HTTPException(status_code=404, detail="User journey not found")

    update_data = journey_update.model_dump(exclude_unset=True)

    # Convert Pydantic models to dicts if present
    if "phases" in update_data and update_data["phases"]:
        update_data["phases"] = [p.model_dump() if hasattr(p, "model_dump") else p for p in update_data["phases"]]
    if "steps" in update_data and update_data["steps"]:
        update_data["steps"] = [s.model_dump() if hasattr(s, "model_dump") else s for s in update_data["steps"]]

    updated = await repo.update(journey_id, **update_data)

    if not updated:
        raise HTTPException(status_code=404, detail="User journey not found")

    return updated


@router.delete(
    "/projects/{project_id}/journeys/{journey_id}",
    status_code=204,
)
async def delete_journey(
    project_id: str,
    journey_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete a user journey."""
    await verify_project_exists(project_id, db)

    repo = UserJourneyRepository(db)
    journey = await repo.get_by_id(journey_id)

    if not journey or journey.project_id != project_id:
        raise HTTPException(status_code=404, detail="User journey not found")

    await repo.delete(journey_id)


@router.post(
    "/projects/{project_id}/journeys/generate",
    response_model=UserJourneyGenerateResponse,
)
async def generate_journey(
    project_id: str,
    request: UserJourneyGenerateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Generate a user journey using AI."""
    from openai import AsyncOpenAI

    await verify_project_exists(project_id, db)

    # Get project context
    project_repo = ProjectRepository(db)
    project = await project_repo.get_by_id(project_id)

    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    prompt = f"""Generate a detailed user journey map for:
Persona: {request.persona}
Goal: {request.goal}
Project context: {project.name} - {project.description or 'No description'}

Return a JSON object with:
- title: journey title
- persona: the persona name
- description: brief description of this journey
- phases: array of phases, each with:
  - id: unique id like "phase_1"
  - name: phase name (e.g., "Discovery", "Consideration", "Action", "Retention")
  - order: numeric order starting from 0
- steps: array of steps, each with:
  - id: unique id like "step_1"
  - phase_id: reference to parent phase id
  - action: what the user does
  - touchpoint: channel (web, mobile, email, support, etc.)
  - emotion: satisfaction level 1-5 (1=frustrated, 5=delighted)
  - thought: what the user thinks
  - pain_point: frustration if any (null if none)
  - opportunity: improvement opportunity if any (null if none)
  - order: numeric order within phase
- tags: relevant tags

Create 4-6 phases with 1-3 steps each. Be specific and realistic.
Return ONLY valid JSON, no markdown or explanation."""

    response = await client.chat.completions.create(
        model=settings.MODEL_CODE_ANALYZER,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
    )

    import json
    journey_data = json.loads(response.choices[0].message.content)

    # Ensure all phases and steps have proper IDs
    for i, phase in enumerate(journey_data.get("phases", [])):
        if "id" not in phase:
            phase["id"] = f"phase_{uuid.uuid4().hex[:8]}"
        if "order" not in phase:
            phase["order"] = i

    for i, step in enumerate(journey_data.get("steps", [])):
        if "id" not in step:
            step["id"] = f"step_{uuid.uuid4().hex[:8]}"
        if "order" not in step:
            step["order"] = i

    # Create the journey
    repo = UserJourneyRepository(db)
    journey = await repo.create(
        project_id=project_id,
        title=journey_data.get("title", f"Journey: {request.persona}"),
        persona=journey_data.get("persona", request.persona),
        description=journey_data.get("description"),
        phases=journey_data.get("phases", []),
        steps=journey_data.get("steps", []),
        tags=journey_data.get("tags", []),
    )

    return UserJourneyGenerateResponse(journey=journey)
