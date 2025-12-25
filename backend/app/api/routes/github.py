"""
GitHub Import API endpoint

Provides SSE-based streaming import from GitHub repositories.
Analyzes code, generates diagrams, and creates a project.
Includes OAuth flow for GitHub authentication.
"""

import json
import logging
import re
import secrets
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import StreamingResponse, RedirectResponse
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.session import get_db
from app.services.github import (
    github_import_service,
    GitHubClient,
    GitHubError,
    GitHubAuthError,
    GitHubNotFoundError,
)
from app.repositories.project_repository import ProjectRepository
from app.repositories.diagram_repository import DiagramRepository
from app.services.multi_agent_handler import execute_with_multi_agent_stream
from app.services.common_operation_handler import get_openai_client
from app.modules.flowchart.utils.prompts import get_flowchart_system_prompt

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/github", tags=["GitHub Import"])

# In-memory store for OAuth states (in production, use Redis or database)
oauth_states: dict[str, dict] = {}

# Rate limiter instance
limiter = Limiter(key_func=get_remote_address)


class GitHubImportRequest(BaseModel):
    """Request body for GitHub import"""
    repo_url: str = Field(..., description="GitHub repository URL")
    auth_token: Optional[str] = Field(None, description="GitHub personal access token for private repos")
    create_project: bool = Field(True, description="Whether to create the project and diagrams")


class GitHubValidateRequest(BaseModel):
    """Request to validate a GitHub repository URL"""
    repo_url: str
    auth_token: Optional[str] = None


class GitHubValidateResponse(BaseModel):
    """Response from repository validation"""
    valid: bool
    repo_name: Optional[str] = None
    description: Optional[str] = None
    is_private: bool = False
    error: Optional[str] = None


async def generate_flowchart_mermaid(prompt: str, title: str) -> dict:
    """
    Generate Mermaid flowchart code using AI.

    Args:
        prompt: The generation prompt from diagram planner
        title: Flowchart title

    Returns:
        Dict with success status and mermaid_code
    """
    client = get_openai_client()
    system_prompt = get_flowchart_system_prompt()

    generation_prompt = f"""Based on this request, generate a complete Mermaid flowchart.

## Request
{prompt}

## Instructions
1. Create a flowchart with proper start and end nodes
2. Use appropriate shapes for each step type
3. Use subgraphs to organize related steps
4. Label all decision branches clearly
5. Use styling for visual clarity

Call the generate_flowchart tool with your complete Mermaid code.
"""

    try:
        response = await client.chat.completions.create(
            model=settings.MODEL_DIAGRAM_PLANNER,  # Use fast model
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": generation_prompt},
            ],
            tools=[{
                "type": "function",
                "function": {
                    "name": "generate_flowchart",
                    "description": "Generate a complete flowchart",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "title": {
                                "type": "string",
                                "description": "Flowchart title"
                            },
                            "mermaid_code": {
                                "type": "string",
                                "description": "Complete Mermaid flowchart code"
                            }
                        },
                        "required": ["title", "mermaid_code"]
                    }
                }
            }],
            tool_choice={"type": "function", "function": {"name": "generate_flowchart"}},
        )

        # Extract tool call
        if response.choices[0].message.tool_calls:
            tool_call = response.choices[0].message.tool_calls[0]
            args = json.loads(tool_call.function.arguments)
            mermaid_code = args.get("mermaid_code", "")

            # Clean up the code
            mermaid_code = mermaid_code.strip()
            if mermaid_code.startswith("```mermaid"):
                mermaid_code = mermaid_code[10:]
            elif mermaid_code.startswith("```"):
                mermaid_code = mermaid_code[3:]
            if mermaid_code.endswith("```"):
                mermaid_code = mermaid_code[:-3]
            mermaid_code = mermaid_code.strip()

            if not mermaid_code.startswith("flowchart") and not mermaid_code.startswith("graph"):
                mermaid_code = "flowchart TB\n" + mermaid_code

            return {
                "success": True,
                "mermaid_code": mermaid_code,
                "title": args.get("title", title)
            }

        return {"success": False, "error": "No tool call in response"}

    except Exception as e:
        logger.error(f"Flowchart generation error: {e}", exc_info=True)
        return {"success": False, "error": str(e)}


@router.post("/validate", response_model=GitHubValidateResponse)
@limiter.limit("30/minute")
async def validate_repository(
    request: Request,
    body: GitHubValidateRequest,
):
    """
    Validate a GitHub repository URL and check access.

    Returns repository info if accessible, or error if not.
    """
    client = GitHubClient(token=body.auth_token)

    try:
        repo_info = await client.fetch_repo_info(body.repo_url)
        return GitHubValidateResponse(
            valid=True,
            repo_name=repo_info.name,
            description=repo_info.description,
            is_private=repo_info.is_private,
        )
    except GitHubAuthError as e:
        return GitHubValidateResponse(
            valid=False,
            error="Authentication required. Please provide a valid GitHub token.",
        )
    except GitHubNotFoundError:
        return GitHubValidateResponse(
            valid=False,
            error="Repository not found or access denied.",
        )
    except GitHubError as e:
        return GitHubValidateResponse(
            valid=False,
            error=str(e),
        )
    except ValueError as e:
        return GitHubValidateResponse(
            valid=False,
            error=str(e),
        )
    finally:
        await client.close()


@router.post("/import")
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def import_from_github(
    request: Request,
    body: GitHubImportRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Import a GitHub repository and generate diagrams.

    This endpoint uses Server-Sent Events (SSE) to stream progress updates:
    - fetching: Retrieving repository data
    - analyzing: AI code analysis
    - planning: Planning diagrams to generate
    - creating: Creating project in database
    - generating: Generating each diagram
    - complete: Import finished with project_id
    - error: If something fails

    The response streams JSON events in SSE format.
    """
    logger.info(f"[GitHub Import] Starting import for: {body.repo_url}")

    async def generate_sse():
        project_id = None

        try:
            # Stream progress from import service
            async for progress in github_import_service.import_repository(
                repo_url=body.repo_url,
                auth_token=body.auth_token,
            ):
                event_data = progress.model_dump()

                # If analysis is complete and we should create project
                if progress.stage == "complete" and body.create_project:
                    details = progress.details or {}
                    repo_analysis = details.get("repo_analysis", {})
                    code_analysis = details.get("code_analysis", {})
                    diagram_plan = details.get("diagram_plan", {})

                    # Create project
                    yield f"data: {json.dumps({'stage': 'creating', 'message': 'Creating project...', 'progress': 60})}\n\n"

                    project_repo = ProjectRepository(db)
                    repo = repo_analysis.get("repo", {})

                    project = await project_repo.create(
                        name=repo.get("name", "GitHub Import"),
                        description=repo.get("description") or f"Imported from {body.repo_url}",
                        tags=repo.get("topics", [])[:5],
                        external_refs={
                            "github": {
                                "url": body.repo_url,
                                "branch": repo.get("default_branch", "main"),
                                "imported_at": str(progress.details.get("timestamp", "")),
                                "analysis": {
                                    "languages": list(repo_analysis.get("languages", {}).keys())[:5],
                                    "frameworks": [f.get("name") for f in repo_analysis.get("frameworks", [])[:5]],
                                    "architecture_type": code_analysis.get("architecture_type"),
                                    "file_count": repo_analysis.get("file_count", 0),
                                }
                            }
                        }
                    )
                    project_id = project.id
                    logger.info(f"[GitHub Import] Created project: {project_id}")

                    # Generate diagrams
                    diagrams = diagram_plan.get("diagrams", [])
                    diagram_repo = DiagramRepository(db)

                    for i, diagram_spec in enumerate(diagrams):
                        progress_pct = 65 + (i / max(len(diagrams), 1)) * 30
                        diagram_type = diagram_spec.get("type", "architecture")
                        diagram_title = diagram_spec.get("title", f"Diagram {i+1}")

                        yield f"data: {json.dumps({'stage': 'generating', 'message': f'Generating: {diagram_title}', 'progress': int(progress_pct), 'details': {'diagram_index': i, 'diagram_type': diagram_type}})}\n\n"

                        try:
                            # Generate diagram using multi-agent pipeline with streaming
                            generation_prompt = diagram_spec.get("generation_prompt", diagram_title)

                            if diagram_type == "architecture":
                                # Use multi-agent streaming for architecture diagrams
                                final_result = None

                                async for agent_event in execute_with_multi_agent_stream(
                                    description=generation_prompt,
                                    module_type="diagrams",
                                    context=None,
                                    conversation_history=None,
                                    max_attempts=2,
                                    max_review_iterations=1,
                                ):
                                    event_type = agent_event.get("type")

                                    if event_type == "agent_update":
                                        # Stream agent progress to frontend
                                        agent_name = agent_event.get("agent", "unknown")
                                        agent_labels = {
                                            "architect": "Analyzing architecture",
                                            "component": "Designing components",
                                            "connection": "Creating connections",
                                            "grouping": "Organizing groups",
                                            "layout": "Calculating layout",
                                            "reviewer": "Reviewing quality",
                                            "finalizer": "Assembling diagram",
                                        }
                                        yield f"data: {json.dumps({'stage': 'agent', 'message': agent_labels.get(agent_name, agent_name), 'progress': int(progress_pct), 'details': {'agent': agent_name, 'diagram_title': diagram_title}})}\n\n"

                                    elif event_type == "review":
                                        # Stream review results
                                        score = agent_event.get("score", 0)
                                        decision = agent_event.get("decision", "unknown")
                                        yield f"data: {json.dumps({'stage': 'agent', 'message': f'Quality review: {score}/10', 'progress': int(progress_pct), 'details': {'agent': 'reviewer', 'score': score, 'decision': decision, 'diagram_title': diagram_title}})}\n\n"

                                    elif event_type == "complete":
                                        final_result = agent_event.get("data", {})

                                    elif event_type == "error":
                                        error_msg = agent_event.get("data", {}).get("message", "Unknown error")
                                        yield f"data: {json.dumps({'stage': 'agent', 'message': f'Error: {error_msg}', 'progress': int(progress_pct), 'details': {'agent': 'error', 'error': error_msg}})}\n\n"

                                if final_result and final_result.get("success"):
                                    # Save diagram to database
                                    diagram_data = final_result.get("diagram", {})
                                    await diagram_repo.create(
                                        project_id=project_id,
                                        name=diagram_title,
                                        description=diagram_spec.get("description", ""),
                                        diagram_type="architecture",
                                        data={
                                            "nodes": diagram_data.get("nodes", []),
                                            "edges": diagram_data.get("edges", []),
                                            "viewport": {"x": 0, "y": 0, "zoom": 1},
                                        },
                                    )
                                    logger.info(f"[GitHub Import] Generated diagram: {diagram_title}")
                                    yield f"data: {json.dumps({'stage': 'agent', 'message': f'Saved: {diagram_title}', 'progress': int(progress_pct), 'details': {'agent': 'saved', 'diagram_title': diagram_title}})}\n\n"

                            elif diagram_type == "flowchart":
                                # Generate Mermaid flowchart
                                yield f"data: {json.dumps({'stage': 'agent', 'message': 'Generating Mermaid code...', 'progress': int(progress_pct), 'details': {'agent': 'flowchart', 'diagram_title': diagram_title}})}\n\n"

                                flowchart_result = await generate_flowchart_mermaid(
                                    prompt=generation_prompt,
                                    title=diagram_title,
                                )

                                if flowchart_result.get("success"):
                                    mermaid_code = flowchart_result.get("mermaid_code", "")

                                    # Save flowchart to database
                                    await diagram_repo.create(
                                        project_id=project_id,
                                        name=diagram_title,
                                        description=diagram_spec.get("description", ""),
                                        diagram_type="flowchart",
                                        data={
                                            "mermaidCode": mermaid_code,
                                            "direction": "TB",
                                        },
                                    )
                                    logger.info(f"[GitHub Import] Generated flowchart: {diagram_title}")
                                    yield f"data: {json.dumps({'stage': 'agent', 'message': f'Saved: {diagram_title}', 'progress': int(progress_pct), 'details': {'agent': 'saved', 'diagram_title': diagram_title}})}\n\n"
                                else:
                                    error_msg = flowchart_result.get("error", "Unknown error")
                                    logger.error(f"[GitHub Import] Flowchart generation failed: {error_msg}")
                                    yield f"data: {json.dumps({'stage': 'agent', 'message': f'Failed: {error_msg}', 'progress': int(progress_pct), 'details': {'agent': 'error', 'error': error_msg}})}\n\n"

                            elif diagram_type == "mindmap":
                                # For mind maps, generate MindElixir data
                                # TODO: Implement mindmap generation
                                pass

                        except Exception as diagram_err:
                            logger.error(f"[GitHub Import] Failed to generate {diagram_title}: {diagram_err}", exc_info=True)
                            yield f"data: {json.dumps({'stage': 'agent', 'message': f'Failed: {diagram_title}', 'progress': int(progress_pct), 'details': {'agent': 'error', 'error': str(diagram_err)}})}\n\n"
                            # Continue with next diagram

                    # Final complete event
                    yield f"data: {json.dumps({'stage': 'complete', 'message': 'Import complete!', 'progress': 100, 'details': {'project_id': project_id, 'diagram_count': len(diagrams)}})}\n\n"

                elif progress.stage == "error":
                    yield f"data: {json.dumps(event_data)}\n\n"

                else:
                    # Stream intermediate progress
                    yield f"data: {json.dumps(event_data)}\n\n"

        except Exception as e:
            logger.error(f"[GitHub Import] Error: {e}", exc_info=True)
            yield f"data: {json.dumps({'stage': 'error', 'message': str(e), 'progress': 0})}\n\n"

    return StreamingResponse(
        generate_sse(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.get("/import/test")
async def test_import_sse():
    """Test endpoint to verify SSE streaming works."""
    import asyncio

    async def generate():
        stages = [
            {"stage": "fetching", "message": "Fetching repository...", "progress": 10},
            {"stage": "analyzing", "message": "Analyzing code...", "progress": 30},
            {"stage": "planning", "message": "Planning diagrams...", "progress": 50},
            {"stage": "generating", "message": "Generating Architecture...", "progress": 70},
            {"stage": "complete", "message": "Import complete!", "progress": 100, "details": {"project_id": "test-123"}},
        ]

        for event in stages:
            yield f"data: {json.dumps(event)}\n\n"
            await asyncio.sleep(0.5)

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


# =====================================================
# OAuth Endpoints
# =====================================================

class OAuthStatusResponse(BaseModel):
    """Response for OAuth status check"""
    configured: bool
    authenticated: bool = False
    username: Optional[str] = None
    avatar_url: Optional[str] = None


class OAuthAuthorizeResponse(BaseModel):
    """Response containing the OAuth authorization URL"""
    authorization_url: str
    state: str


class OAuthTokenResponse(BaseModel):
    """Response after successful OAuth callback"""
    success: bool
    access_token: Optional[str] = None
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    error: Optional[str] = None


@router.get("/oauth/status", response_model=OAuthStatusResponse)
async def get_oauth_status():
    """
    Check if GitHub OAuth is configured.
    """
    configured = bool(settings.GITHUB_CLIENT_ID and settings.GITHUB_CLIENT_SECRET)
    return OAuthStatusResponse(configured=configured)


@router.get("/oauth/authorize", response_model=OAuthAuthorizeResponse)
async def start_oauth_flow():
    """
    Start the GitHub OAuth flow.
    Returns the authorization URL to redirect the user to.
    """
    if not settings.GITHUB_CLIENT_ID:
        raise HTTPException(
            status_code=400,
            detail="GitHub OAuth is not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET."
        )

    # Generate a random state for CSRF protection
    state = secrets.token_urlsafe(32)

    # Store state for validation
    oauth_states[state] = {"created_at": json.dumps(str(__import__("datetime").datetime.now()))}

    # Build GitHub authorization URL
    params = {
        "client_id": settings.GITHUB_CLIENT_ID,
        "redirect_uri": settings.GITHUB_OAUTH_REDIRECT_URI,
        "scope": "repo read:user",  # Access to private repos and user info
        "state": state,
    }

    authorization_url = f"https://github.com/login/oauth/authorize?{urlencode(params)}"

    return OAuthAuthorizeResponse(
        authorization_url=authorization_url,
        state=state,
    )


@router.post("/oauth/callback")
async def handle_oauth_callback(
    code: str,
    state: str,
):
    """
    Handle the OAuth callback from GitHub.
    Exchanges the authorization code for an access token.
    """
    # Validate state
    if state not in oauth_states:
        raise HTTPException(status_code=400, detail="Invalid state parameter")

    # Remove used state
    del oauth_states[state]

    if not settings.GITHUB_CLIENT_ID or not settings.GITHUB_CLIENT_SECRET:
        raise HTTPException(status_code=400, detail="GitHub OAuth not configured")

    # Exchange code for access token
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": code,
                "redirect_uri": settings.GITHUB_OAUTH_REDIRECT_URI,
            },
            headers={"Accept": "application/json"},
        )

        if token_response.status_code != 200:
            return OAuthTokenResponse(
                success=False,
                error="Failed to exchange code for token",
            )

        token_data = token_response.json()

        if "error" in token_data:
            return OAuthTokenResponse(
                success=False,
                error=token_data.get("error_description", token_data["error"]),
            )

        access_token = token_data.get("access_token")

        # Fetch user info
        user_response = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github.v3+json",
            },
        )

        username = None
        avatar_url = None

        if user_response.status_code == 200:
            user_data = user_response.json()
            username = user_data.get("login")
            avatar_url = user_data.get("avatar_url")

        return OAuthTokenResponse(
            success=True,
            access_token=access_token,
            username=username,
            avatar_url=avatar_url,
        )


@router.get("/oauth/user")
async def get_github_user(token: str):
    """
    Get the authenticated GitHub user info.
    """
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github.v3+json",
            },
        )

        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid token")

        user_data = response.json()
        return {
            "username": user_data.get("login"),
            "name": user_data.get("name"),
            "avatar_url": user_data.get("avatar_url"),
            "email": user_data.get("email"),
        }


# =====================================================
# GitHub Attach/Detach Endpoints
# =====================================================


class GitHubAttachRequest(BaseModel):
    """Request to attach a GitHub repo to a project"""
    repo_url: str = Field(..., description="GitHub repository URL")
    auth_token: Optional[str] = Field(None, description="GitHub token for metadata fetch")
    fetch_metadata: bool = Field(True, description="Whether to fetch repo metadata from GitHub API")


class GitHubAttachmentData(BaseModel):
    """GitHub attachment data stored in project.external_refs"""
    url: str
    owner: str
    repo_name: str
    attached_at: str
    branch: Optional[str] = None
    description: Optional[str] = None
    stars: Optional[int] = None
    language: Optional[str] = None
    is_private: bool = False


class GitHubAttachResponse(BaseModel):
    """Response from attach endpoint"""
    success: bool
    github: Optional[GitHubAttachmentData] = None
    error: Optional[str] = None


class GitHubDetachResponse(BaseModel):
    """Response from detach endpoint"""
    success: bool
    message: str


def parse_github_url(url: str) -> tuple[str, str]:
    """
    Parse a GitHub URL to extract owner and repo name.

    Args:
        url: GitHub repository URL

    Returns:
        Tuple of (owner, repo_name)

    Raises:
        ValueError: If URL is not a valid GitHub repository URL
    """
    pattern = r'^https?://github\.com/([^/]+)/([^/]+?)(?:\.git)?/?$'
    match = re.match(pattern, url.strip())
    if not match:
        raise ValueError("Invalid GitHub repository URL. Expected format: https://github.com/owner/repo")
    return match.group(1), match.group(2)


@router.post("/attach/{project_id}", response_model=GitHubAttachResponse)
@limiter.limit("30/minute")
async def attach_github_repo(
    request: Request,
    project_id: str,
    body: GitHubAttachRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Attach a GitHub repository to an existing project.

    This stores the GitHub URL and optional metadata in the project's external_refs field.
    If fetch_metadata is True and a token is provided, it will fetch additional repo info.
    """
    try:
        # Parse and validate URL
        owner, repo_name = parse_github_url(body.repo_url)
    except ValueError as e:
        return GitHubAttachResponse(success=False, error=str(e))

    # Build attachment data
    attachment = GitHubAttachmentData(
        url=body.repo_url.strip().rstrip('/'),
        owner=owner,
        repo_name=repo_name,
        attached_at=datetime.now(timezone.utc).isoformat(),
    )

    # Optionally fetch metadata from GitHub API
    if body.fetch_metadata:
        try:
            client = GitHubClient(token=body.auth_token)
            try:
                repo_info = await client.fetch_repo_info(body.repo_url)
                attachment.branch = repo_info.default_branch
                attachment.description = repo_info.description
                attachment.stars = repo_info.stars
                attachment.language = repo_info.language
                attachment.is_private = repo_info.is_private
            finally:
                await client.close()
        except Exception as e:
            # Log but don't fail - metadata is optional
            logger.warning(f"Failed to fetch GitHub metadata: {e}")

    # Get project and update external_refs
    project_repo = ProjectRepository(db)
    project = await project_repo.get(project_id)

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Update external_refs with github data
    external_refs = dict(project.external_refs) if project.external_refs else {}
    external_refs["github"] = attachment.model_dump()

    await project_repo.update(project_id, external_refs=external_refs)

    logger.info(f"Attached GitHub repo {owner}/{repo_name} to project {project_id}")

    return GitHubAttachResponse(success=True, github=attachment)


@router.delete("/attach/{project_id}", response_model=GitHubDetachResponse)
@limiter.limit("30/minute")
async def detach_github_repo(
    request: Request,
    project_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Detach a GitHub repository from a project.

    Removes the GitHub data from the project's external_refs field.
    """
    project_repo = ProjectRepository(db)
    project = await project_repo.get(project_id)

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check if there's a GitHub attachment
    external_refs = dict(project.external_refs) if project.external_refs else {}

    if "github" not in external_refs:
        return GitHubDetachResponse(success=True, message="No GitHub repository was attached")

    # Remove github from external_refs
    del external_refs["github"]
    await project_repo.update(project_id, external_refs=external_refs)

    logger.info(f"Detached GitHub repo from project {project_id}")

    return GitHubDetachResponse(success=True, message="GitHub repository detached successfully")


class RepoListItem(BaseModel):
    """Repository item in list"""
    id: int
    name: str
    full_name: str
    description: Optional[str] = None
    html_url: str
    private: bool = False
    language: Optional[str] = None
    stargazers_count: int = 0
    updated_at: str


@router.get("/repos")
async def list_user_repositories(
    token: str,
    page: int = 1,
    per_page: int = 30,
    sort: str = "updated",  # updated, pushed, full_name
):
    """
    List repositories for the authenticated user.
    Returns both owned repos and repos the user has access to.
    """
    async with httpx.AsyncClient() as client:
        # Fetch user's repositories (includes private repos they own or have access to)
        response = await client.get(
            "https://api.github.com/user/repos",
            params={
                "sort": sort,
                "direction": "desc",
                "per_page": per_page,
                "page": page,
                "affiliation": "owner,collaborator,organization_member",
            },
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github.v3+json",
            },
        )

        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid token or access denied")

        repos = response.json()

        return {
            "repos": [
                {
                    "id": repo["id"],
                    "name": repo["name"],
                    "full_name": repo["full_name"],
                    "description": repo.get("description"),
                    "html_url": repo["html_url"],
                    "private": repo.get("private", False),
                    "language": repo.get("language"),
                    "stargazers_count": repo.get("stargazers_count", 0),
                    "updated_at": repo.get("updated_at", ""),
                }
                for repo in repos
            ],
            "page": page,
            "per_page": per_page,
            "has_more": len(repos) == per_page,
        }


@router.get("/repos/search")
async def search_user_repositories(
    token: str,
    query: str,
    per_page: int = 10,
):
    """
    Search repositories the user has access to.
    """
    async with httpx.AsyncClient() as client:
        # First get the username
        user_response = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github.v3+json",
            },
        )

        if user_response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid token")

        username = user_response.json().get("login")

        # Search in user's repos
        search_response = await client.get(
            "https://api.github.com/search/repositories",
            params={
                "q": f"{query} user:{username} fork:true",
                "per_page": per_page,
                "sort": "updated",
            },
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github.v3+json",
            },
        )

        if search_response.status_code != 200:
            return {"repos": []}

        data = search_response.json()

        return {
            "repos": [
                {
                    "id": repo["id"],
                    "name": repo["name"],
                    "full_name": repo["full_name"],
                    "description": repo.get("description"),
                    "html_url": repo["html_url"],
                    "private": repo.get("private", False),
                    "language": repo.get("language"),
                    "stargazers_count": repo.get("stargazers_count", 0),
                    "updated_at": repo.get("updated_at", ""),
                }
                for repo in data.get("items", [])
            ],
        }
