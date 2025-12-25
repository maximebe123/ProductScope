"""API routes for KPIs."""

import json
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.repositories.project_repository import ProjectRepository
from app.repositories.kpi_repository import KPIRepository
from app.models.kpi import KPIStatus, KPIPriority, KPICategory
from app.schemas.kpi import (
    KPICreate,
    KPIUpdate,
    KPIResponse,
    KPIDiscoveryRequest,
    KPIBatchCreateRequest,
    KPIBatchCreateResponse,
)
from app.services.github.client import GitHubClient

logger = logging.getLogger(__name__)

router = APIRouter(tags=["KPIs"])


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
    "/projects/{project_id}/kpis",
    response_model=List[KPIResponse],
)
async def list_kpis(
    project_id: str,
    status: Optional[KPIStatus] = Query(None),
    category: Optional[KPICategory] = Query(None),
    priority: Optional[KPIPriority] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """List all KPIs in a project."""
    await verify_project_exists(project_id, db)

    repo = KPIRepository(db)
    kpis = await repo.get_by_project(
        project_id,
        status=status,
        category=category,
        priority=priority,
        skip=skip,
        limit=limit,
    )
    return kpis


@router.get(
    "/projects/{project_id}/kpis/{kpi_id}",
    response_model=KPIResponse,
)
async def get_kpi(
    project_id: str,
    kpi_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific KPI."""
    await verify_project_exists(project_id, db)

    repo = KPIRepository(db)
    kpi = await repo.get_by_id(kpi_id)

    if not kpi or kpi.project_id != project_id:
        raise HTTPException(status_code=404, detail="KPI not found")

    return kpi


@router.post(
    "/projects/{project_id}/kpis",
    response_model=KPIResponse,
    status_code=201,
)
async def create_kpi(
    project_id: str,
    kpi: KPICreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new KPI in a project."""
    await verify_project_exists(project_id, db)

    repo = KPIRepository(db)
    return await repo.create(
        project_id=project_id,
        name=kpi.name,
        definition=kpi.definition,
        category=kpi.category,
        calculation_method=kpi.calculation_method,
        data_sources=kpi.data_sources,
        unit=kpi.unit,
        frequency=kpi.frequency,
        target_guidance=kpi.target_guidance,
        business_value=kpi.business_value,
        impact_areas=kpi.impact_areas,
        technical_notes=kpi.technical_notes,
        priority=kpi.priority,
        tags=kpi.tags,
    )


@router.patch(
    "/projects/{project_id}/kpis/{kpi_id}",
    response_model=KPIResponse,
)
async def update_kpi(
    project_id: str,
    kpi_id: str,
    kpi_update: KPIUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a KPI."""
    await verify_project_exists(project_id, db)

    repo = KPIRepository(db)
    kpi = await repo.get_by_id(kpi_id)

    if not kpi or kpi.project_id != project_id:
        raise HTTPException(status_code=404, detail="KPI not found")

    update_data = kpi_update.model_dump(exclude_unset=True)
    updated = await repo.update(kpi_id, **update_data)

    if not updated:
        raise HTTPException(status_code=404, detail="KPI not found")

    return updated


@router.delete(
    "/projects/{project_id}/kpis/{kpi_id}",
    status_code=204,
)
async def delete_kpi(
    project_id: str,
    kpi_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete a KPI."""
    await verify_project_exists(project_id, db)

    repo = KPIRepository(db)
    kpi = await repo.get_by_id(kpi_id)

    if not kpi or kpi.project_id != project_id:
        raise HTTPException(status_code=404, detail="KPI not found")

    await repo.delete(kpi_id)


@router.post(
    "/projects/{project_id}/kpis/discover-from-github",
)
async def discover_kpis_from_github(
    project_id: str,
    request: KPIDiscoveryRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Discover business KPIs from a GitHub repository using AI agents.

    Analyzes the codebase to understand the business domain and suggests
    relevant KPIs for valorizing the application.

    Returns a Server-Sent Events (SSE) stream with discovery progress.
    """
    from app.services.kpi_discovery_streaming import execute_kpi_discovery_with_streaming

    # Verify project exists and has GitHub attached
    project_repo = ProjectRepository(db)
    project = await project_repo.get_by_id(project_id)

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check if GitHub is attached
    external_refs = project.external_refs or {}
    github_ref = external_refs.get("github")

    if not github_ref:
        raise HTTPException(
            status_code=400,
            detail="No GitHub repository attached to this project"
        )

    # Fetch repository data
    github_client = GitHubClient(token=request.auth_token)

    # Get owner/repo from stored data or parse from URL
    owner = github_ref.get("owner")
    repo_name = github_ref.get("repo_name")
    repo_url = github_ref.get("url")
    branch = github_ref.get("branch", "main")

    # If owner/repo_name not stored, parse from URL
    if repo_url and (not owner or not repo_name):
        try:
            parsed_owner, parsed_repo = github_client.parse_repo_url(repo_url)
            owner = owner or parsed_owner
            repo_name = repo_name or parsed_repo
        except ValueError:
            pass

    if not owner or not repo_name:
        raise HTTPException(
            status_code=400,
            detail="Invalid GitHub attachment: missing owner or repository name"
        )

    if not repo_url:
        repo_url = f"https://github.com/{owner}/{repo_name}"

    logger.info(f"[KPIDiscovery] Fetching repo: {repo_url} (owner={owner}, repo={repo_name}, branch={branch})")

    try:
        # Fetch repo info using the stored URL
        repo_info = await github_client.fetch_repo_info(repo_url)

        # Get file tree
        file_nodes = await github_client.fetch_file_tree(owner, repo_name, branch)
        file_tree = [node.path for node in file_nodes]

        # Filter and fetch key files content
        analyzable_files = github_client.filter_analyzable_files(file_nodes)
        priority_paths = [f.path for f in analyzable_files[:30]]
        file_contents = await github_client.batch_fetch_files(owner, repo_name, priority_paths, branch)

        # Build key files list
        key_files = [
            {"path": path, "content": content}
            for path, content in file_contents.items()
        ]

        # Extract README content
        readme_content = None
        for f in key_files:
            if f["path"].lower() in ("readme.md", "readme.rst", "readme", "readme.txt"):
                readme_content = f["content"]
                break

        # Build repo analysis
        repo_analysis = {
            "owner": owner,
            "repo_name": repo_name,
            "branch": branch,
            "description": repo_info.description,
            "language": repo_info.language,
            "topics": repo_info.topics,
            "readme_content": readme_content,
            "file_tree": file_tree,
            "key_files": key_files,
            "package_json": None,
            "requirements_txt": None,
        }

        # Extract package.json and requirements.txt from key files
        for f in key_files:
            if f.get("path") == "package.json":
                try:
                    repo_analysis["package_json"] = json.loads(f.get("content", "{}"))
                except json.JSONDecodeError:
                    pass
            elif f.get("path") == "requirements.txt":
                repo_analysis["requirements_txt"] = f.get("content")

        # Close client after successful fetch
        await github_client.close()

    except Exception as e:
        logger.error(f"Failed to fetch GitHub repository data: {e}", exc_info=True)
        await github_client.close()

        # Check if it's a private repo issue
        is_private = github_ref.get("is_private", False)
        error_msg = str(e)

        if "not found" in error_msg.lower() or "access denied" in error_msg.lower():
            if is_private:
                detail = "This is a private repository. KPI discovery for private repos requires authentication."
            else:
                detail = f"Repository not accessible: {error_msg}. Please verify the repository exists and is public."
        else:
            detail = f"Failed to fetch GitHub repository: {error_msg}"

        raise HTTPException(status_code=502, detail=detail)

    # Get existing KPIs
    kpi_repo = KPIRepository(db)
    existing_kpis = await kpi_repo.get_by_project(project_id, limit=100)
    existing_kpis_data = [
        {"id": str(k.id), "name": k.name, "category": k.category.value}
        for k in existing_kpis
    ]

    # Create SSE stream
    async def event_generator():
        try:
            async for event in execute_kpi_discovery_with_streaming(
                repo_analysis=repo_analysis,
                project_id=project_id,
                existing_kpis=existing_kpis_data,
                user_context=request.user_context,
                focus_categories=request.focus_categories,
            ):
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as e:
            logger.error(f"KPI discovery error: {e}", exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.post(
    "/projects/{project_id}/kpis/batch",
    response_model=KPIBatchCreateResponse,
    status_code=201,
)
async def batch_create_kpis(
    project_id: str,
    request: KPIBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple KPIs at once from discovery results."""
    await verify_project_exists(project_id, db)

    repo = KPIRepository(db)
    created_kpis = []

    for candidate in request.kpis:
        # Map category string to enum
        try:
            category = KPICategory(candidate.category)
        except ValueError:
            category = KPICategory.EFFICIENCY

        # Map priority string to enum
        try:
            priority = KPIPriority(candidate.priority)
        except ValueError:
            priority = KPIPriority.MEDIUM

        kpi = await repo.create(
            project_id=project_id,
            name=candidate.name,
            definition=candidate.definition,
            category=category,
            calculation_method=candidate.calculation_method,
            data_sources=candidate.data_sources,
            unit=candidate.unit,
            frequency=candidate.frequency,
            target_guidance=candidate.target_guidance,
            business_value=candidate.business_value,
            impact_areas=candidate.impact_areas,
            priority=priority,
        )
        created_kpis.append(kpi)

    return KPIBatchCreateResponse(
        created=created_kpis,
        count=len(created_kpis),
    )
