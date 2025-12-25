"""API routes for Features."""

import json
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.repositories.project_repository import ProjectRepository
from app.repositories.feature_repository import FeatureRepository
from app.models.feature import FeatureStatus, FeaturePriority
from app.schemas.feature import (
    FeatureCreate,
    FeatureUpdate,
    FeatureResponse,
    FeatureGenerateRequest,
    FeatureGenerateResponse,
    FeatureDiscoveryRequest,
    FeatureExtractionRequest,
    FeatureBatchCreateRequest,
    FeatureBatchCreateResponse,
)
from app.config import settings
from app.services.github.client import GitHubClient

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Features"])


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
    "/projects/{project_id}/features",
    response_model=List[FeatureResponse],
)
async def list_features(
    project_id: str,
    status: Optional[FeatureStatus] = Query(None),
    priority: Optional[FeaturePriority] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """List all features in a project."""
    await verify_project_exists(project_id, db)

    repo = FeatureRepository(db)
    features = await repo.get_by_project(
        project_id,
        status=status,
        priority=priority,
        skip=skip,
        limit=limit,
    )
    return features


@router.get(
    "/projects/{project_id}/features/{feature_id}",
    response_model=FeatureResponse,
)
async def get_feature(
    project_id: str,
    feature_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific feature."""
    await verify_project_exists(project_id, db)

    repo = FeatureRepository(db)
    feature = await repo.get_by_id(feature_id)

    if not feature or feature.project_id != project_id:
        raise HTTPException(status_code=404, detail="Feature not found")

    return feature


@router.post(
    "/projects/{project_id}/features",
    response_model=FeatureResponse,
    status_code=201,
)
async def create_feature(
    project_id: str,
    feature: FeatureCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new feature in a project."""
    await verify_project_exists(project_id, db)

    repo = FeatureRepository(db)
    return await repo.create(
        project_id=project_id,
        title=feature.title,
        problem=feature.problem,
        solution=feature.solution,
        target_users=feature.target_users,
        success_metrics=feature.success_metrics,
        user_stories=feature.user_stories,
        technical_notes=feature.technical_notes,
        priority=feature.priority,
        tags=feature.tags,
    )


@router.patch(
    "/projects/{project_id}/features/{feature_id}",
    response_model=FeatureResponse,
)
async def update_feature(
    project_id: str,
    feature_id: str,
    feature_update: FeatureUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a feature."""
    await verify_project_exists(project_id, db)

    repo = FeatureRepository(db)
    feature = await repo.get_by_id(feature_id)

    if not feature or feature.project_id != project_id:
        raise HTTPException(status_code=404, detail="Feature not found")

    update_data = feature_update.model_dump(exclude_unset=True)
    updated = await repo.update(feature_id, **update_data)

    if not updated:
        raise HTTPException(status_code=404, detail="Feature not found")

    return updated


@router.delete(
    "/projects/{project_id}/features/{feature_id}",
    status_code=204,
)
async def delete_feature(
    project_id: str,
    feature_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete a feature."""
    await verify_project_exists(project_id, db)

    repo = FeatureRepository(db)
    feature = await repo.get_by_id(feature_id)

    if not feature or feature.project_id != project_id:
        raise HTTPException(status_code=404, detail="Feature not found")

    await repo.delete(feature_id)


@router.post(
    "/projects/{project_id}/features/generate",
    response_model=FeatureGenerateResponse,
)
async def generate_feature(
    project_id: str,
    request: FeatureGenerateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Generate a feature specification using AI."""
    from openai import AsyncOpenAI

    await verify_project_exists(project_id, db)

    # Get project context
    project_repo = ProjectRepository(db)
    project = await project_repo.get_by_id(project_id)

    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    prompt = f"""Generate a structured feature specification from this description:
{request.description}

Project context: {project.name} - {project.description or 'No description'}

Return a JSON object with these fields:
- title: concise feature title (max 100 chars)
- problem: the problem this feature solves (2-3 sentences)
- solution: the proposed solution (2-3 sentences)
- target_users: who will benefit from this feature
- success_metrics: measurable success criteria
- technical_notes: any technical considerations (optional)
- priority: one of "low", "medium", "high", "critical"
- tags: relevant tags as array of strings

Return ONLY valid JSON, no markdown or explanation."""

    response = await client.chat.completions.create(
        model=settings.MODEL_CODE_ANALYZER,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
    )

    import json
    feature_data = json.loads(response.choices[0].message.content)

    # Create the feature
    repo = FeatureRepository(db)
    feature = await repo.create(
        project_id=project_id,
        title=feature_data.get("title", "Generated Feature"),
        problem=feature_data.get("problem"),
        solution=feature_data.get("solution"),
        target_users=feature_data.get("target_users"),
        success_metrics=feature_data.get("success_metrics"),
        technical_notes=feature_data.get("technical_notes"),
        priority=FeaturePriority(feature_data.get("priority", "medium")),
        tags=feature_data.get("tags", []),
    )

    return FeatureGenerateResponse(feature=feature)


@router.post(
    "/projects/{project_id}/features/discover-from-github",
)
async def discover_features_from_github(
    project_id: str,
    request: FeatureDiscoveryRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Discover features from a GitHub repository using AI agents.

    Returns a Server-Sent Events (SSE) stream with discovery progress.
    """
    from app.services.feature_discovery_streaming import execute_feature_discovery_with_streaming

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
    # Use auth token if provided (required for private repos)
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

    logger.info(f"[FeatureDiscovery] Fetching repo: {repo_url} (owner={owner}, repo={repo_name}, branch={branch})")

    try:
        # Fetch repo info using the stored URL
        repo_info = await github_client.fetch_repo_info(repo_url)

        # Get file tree
        file_nodes = await github_client.fetch_file_tree(owner, repo_name, branch)
        file_tree = [node.path for node in file_nodes]

        # Filter and fetch key files content
        analyzable_files = github_client.filter_analyzable_files(file_nodes)
        priority_paths = [f.path for f in analyzable_files[:30]]  # Limit to top 30 files
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
                detail = "This is a private repository. Feature discovery for private repos requires authentication which is not yet supported."
            else:
                detail = f"Repository not accessible: {error_msg}. Please verify the repository exists and is public."
        else:
            detail = f"Failed to fetch GitHub repository: {error_msg}"

        raise HTTPException(status_code=502, detail=detail)

    # Get existing features
    feature_repo = FeatureRepository(db)
    existing_features = await feature_repo.get_by_project(project_id, limit=100)
    existing_features_data = [
        {"id": str(f.id), "title": f.title, "status": f.status.value}
        for f in existing_features
    ]

    # Create SSE stream
    async def event_generator():
        try:
            async for event in execute_feature_discovery_with_streaming(
                repo_analysis=repo_analysis,
                project_id=project_id,
                existing_features=existing_features_data,
                user_context=request.user_context,
                max_features=request.max_features,
                include_tech_debt=request.include_tech_debt,
            ):
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as e:
            logger.error(f"Feature discovery error: {e}", exc_info=True)
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
    "/projects/{project_id}/features/extract-from-github",
)
async def extract_features_from_github(
    project_id: str,
    request: FeatureExtractionRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Extract EXISTING features from a GitHub repository using AI agents.

    Unlike discover-from-github which suggests NEW features, this endpoint
    identifies features that are already implemented in the codebase.

    Returns a Server-Sent Events (SSE) stream with extraction progress.
    """
    from app.services.feature_extraction_streaming import execute_feature_extraction_with_streaming

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

    logger.info(f"[FeatureExtraction] Fetching repo: {repo_url} (owner={owner}, repo={repo_name}, branch={branch})")

    try:
        # Fetch repo info using the stored URL
        repo_info = await github_client.fetch_repo_info(repo_url)

        # Get file tree
        file_nodes = await github_client.fetch_file_tree(owner, repo_name, branch)
        file_tree = [node.path for node in file_nodes]

        # Filter and fetch key files content
        analyzable_files = github_client.filter_analyzable_files(file_nodes)
        priority_paths = [f.path for f in analyzable_files[:40]]  # More files for extraction
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
                detail = "This is a private repository. Feature extraction for private repos requires authentication."
            else:
                detail = f"Repository not accessible: {error_msg}. Please verify the repository exists and is public."
        else:
            detail = f"Failed to fetch GitHub repository: {error_msg}"

        raise HTTPException(status_code=502, detail=detail)

    # Create SSE stream
    async def event_generator():
        try:
            async for event in execute_feature_extraction_with_streaming(
                repo_analysis=repo_analysis,
                project_id=project_id,
                user_context=request.user_context,
                focus_areas=request.focus_areas,
                max_features=request.max_features,
            ):
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as e:
            logger.error(f"Feature extraction error: {e}", exc_info=True)
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
    "/projects/{project_id}/features/batch",
    response_model=FeatureBatchCreateResponse,
    status_code=201,
)
async def batch_create_features(
    project_id: str,
    request: FeatureBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple features at once from discovery results."""
    await verify_project_exists(project_id, db)

    repo = FeatureRepository(db)
    created_features = []

    for candidate in request.features:
        # Map priority string to enum
        try:
            priority = FeaturePriority(candidate.priority)
        except ValueError:
            priority = FeaturePriority.MEDIUM

        feature = await repo.create(
            project_id=project_id,
            title=candidate.title,
            problem=candidate.problem,
            solution=candidate.solution,
            target_users=candidate.target_users,
            success_metrics=candidate.success_metrics,
            technical_notes=candidate.technical_notes,
            priority=priority,
            tags=candidate.tags,
        )
        created_features.append(feature)

    return FeatureBatchCreateResponse(
        created=created_features,
        count=len(created_features),
    )
