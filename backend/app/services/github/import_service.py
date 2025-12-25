"""
GitHub Import Service

Orchestrates the complete import process:
1. Fetch repository data
2. Analyze code structure
3. Use AI to understand architecture
4. Plan and generate diagrams
5. Create project with diagrams
"""

import json
from typing import AsyncGenerator, Dict, Any, Optional
from datetime import datetime

from openai import AsyncOpenAI

from app.config import settings
from app.services.common_operation_handler import get_openai_client
from app.core.ai.prompts import get_code_analyzer_prompt, get_diagram_planner_prompt

from .client import GitHubClient
from .analyzer import RepositoryAnalyzer
from .models import ImportProgress, RepoAnalysis


class GitHubImportService:
    """
    Service for importing GitHub repositories and generating diagrams.
    Yields progress events for SSE streaming.
    """

    def __init__(self):
        self._client: Optional[AsyncOpenAI] = None

    @property
    def openai_client(self) -> AsyncOpenAI:
        """Get OpenAI client singleton"""
        if self._client is None:
            self._client = get_openai_client()
        return self._client

    async def import_repository(
        self,
        repo_url: str,
        auth_token: Optional[str] = None,
    ) -> AsyncGenerator[ImportProgress, None]:
        """
        Import a GitHub repository and generate diagrams.

        Args:
            repo_url: GitHub repository URL
            auth_token: Optional GitHub token for private repos

        Yields:
            ImportProgress events for SSE streaming
        """
        # Initialize clients
        github_client = GitHubClient(token=auth_token)
        analyzer = RepositoryAnalyzer(github_client)

        try:
            # Phase 1: Fetch repository (0-15%)
            yield ImportProgress(
                stage="fetching",
                message="Fetching repository information...",
                progress=5,
            )

            repo_analysis = await analyzer.analyze(repo_url)

            yield ImportProgress(
                stage="fetching",
                message=f"Found {repo_analysis.file_count} files in {repo_analysis.repo.name}",
                progress=15,
                details={
                    "repo_name": repo_analysis.repo.name,
                    "file_count": repo_analysis.file_count,
                    "languages": list(repo_analysis.languages.keys())[:5],
                    "frameworks": [f.name for f in repo_analysis.frameworks[:5]],
                },
            )

            # Phase 2: AI Code Analysis (15-40%)
            yield ImportProgress(
                stage="analyzing",
                message="Analyzing code architecture with AI...",
                progress=20,
            )

            code_analysis = await self._analyze_with_ai(repo_analysis)

            yield ImportProgress(
                stage="analyzing",
                message=f"Detected {code_analysis.get('architecture_type', 'unknown')} architecture",
                progress=40,
                details={
                    "architecture_type": code_analysis.get("architecture_type"),
                    "components": len(code_analysis.get("components", [])),
                    "data_flows": len(code_analysis.get("data_flows", [])),
                },
            )

            # Phase 3: Plan Diagrams (40-55%)
            yield ImportProgress(
                stage="planning",
                message="Planning diagrams...",
                progress=45,
            )

            diagram_plan = await self._plan_diagrams(code_analysis, repo_analysis.repo.name)
            diagrams = diagram_plan.get("diagrams", [])

            yield ImportProgress(
                stage="planning",
                message=f"Planned {len(diagrams)} diagram(s)",
                progress=55,
                details={
                    "diagram_count": len(diagrams),
                    "diagram_types": [d.get("type") for d in diagrams],
                },
            )

            # Phase 4: Return plan for project creation (55-100%)
            # Note: Actual diagram generation and project creation
            # will be handled by the route handler using existing services

            yield ImportProgress(
                stage="complete",
                message="Analysis complete! Ready to create project.",
                progress=100,
                details={
                    "repo_analysis": self._serialize_analysis(repo_analysis),
                    "code_analysis": code_analysis,
                    "diagram_plan": diagram_plan,
                },
            )

        except Exception as e:
            yield ImportProgress(
                stage="error",
                message=f"Import failed: {str(e)}",
                progress=0,
                details={"error": str(e)},
            )

        finally:
            await github_client.close()

    async def _analyze_with_ai(self, repo_analysis: RepoAnalysis) -> Dict[str, Any]:
        """
        Use GPT-5 to analyze the repository code.

        Args:
            repo_analysis: Parsed repository data

        Returns:
            AI analysis result dict
        """
        # Build prompt with repository context
        prompt = get_code_analyzer_prompt(repo_analysis.model_dump())

        try:
            response = await self.openai_client.chat.completions.create(
                model=settings.MODEL_CODE_ANALYZER,
                messages=[
                    {"role": "system", "content": prompt},
                    {
                        "role": "user",
                        "content": "Analyze this repository and return your analysis as JSON.",
                    },
                ],
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content
            return json.loads(content) if content else {}

        except json.JSONDecodeError:
            # Return structured fallback
            return {
                "architecture_type": repo_analysis.architecture_type or "monolith",
                "architecture_summary": f"Repository {repo_analysis.repo.name}",
                "components": [
                    {"name": f.name, "type": f.category}
                    for f in repo_analysis.frameworks
                ],
                "data_flows": [],
                "business_processes": [],
            }

    async def _plan_diagrams(
        self,
        code_analysis: Dict[str, Any],
        repo_name: str,
    ) -> Dict[str, Any]:
        """
        Use GPT-5-mini to plan which diagrams to generate.

        Args:
            code_analysis: Result from code analyzer
            repo_name: Repository name

        Returns:
            Diagram plan with generation prompts
        """
        prompt = get_diagram_planner_prompt(code_analysis, repo_name)

        try:
            response = await self.openai_client.chat.completions.create(
                model=settings.MODEL_DIAGRAM_PLANNER,
                messages=[
                    {"role": "system", "content": prompt},
                    {
                        "role": "user",
                        "content": "Plan the diagrams for this repository. Return as JSON.",
                    },
                ],
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content
            return json.loads(content) if content else {"diagrams": []}

        except json.JSONDecodeError:
            # Return minimal default plan
            return {
                "diagrams": [
                    {
                        "type": "architecture",
                        "title": f"{repo_name} Architecture",
                        "description": "System architecture overview",
                        "priority": 1,
                        "generation_prompt": f"Create an architecture diagram for {repo_name}",
                    }
                ],
                "rationale": "Default architecture diagram",
            }

    def _serialize_analysis(self, analysis: RepoAnalysis) -> Dict[str, Any]:
        """Serialize RepoAnalysis for JSON response"""
        data = analysis.model_dump()

        # Convert datetime objects
        if data.get("repo", {}).get("created_at"):
            data["repo"]["created_at"] = str(data["repo"]["created_at"])
        if data.get("repo", {}).get("updated_at"):
            data["repo"]["updated_at"] = str(data["repo"]["updated_at"])

        # Limit size of key_files
        if "key_files" in data:
            data["key_files"] = {
                k: v[:500] + "..." if len(v) > 500 else v
                for k, v in list(data["key_files"].items())[:5]
            }

        return data


# Singleton instance
github_import_service = GitHubImportService()
