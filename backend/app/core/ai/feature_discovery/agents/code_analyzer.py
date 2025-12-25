"""
Code Analyzer Agent

Analyzes the repository structure, patterns, and existing features.
Uses GPT-5.2 for deep reasoning about code architecture.
"""

import json
import logging
from typing import Any, Dict, List

from openai import AsyncOpenAI
from pydantic import BaseModel, Field

from app.config import settings
from app.core.ai.feature_discovery.state import FeatureDiscoveryState, CodeAnalysisResult
from app.core.ai.prompts.feature_discovery.code_analyzer import (
    CODE_ANALYZER_SYSTEM,
    CODE_ANALYZER_PROMPT,
)

logger = logging.getLogger(__name__)

_client = None


def get_openai_client() -> AsyncOpenAI:
    """Get or create OpenAI client singleton."""
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


def format_file_tree(file_list: List[str], max_items: int = 100) -> str:
    """Format file tree for display."""
    if not file_list:
        return "(empty)"

    # Limit files shown
    files = file_list[:max_items]
    tree = "\n".join(files)

    if len(file_list) > max_items:
        tree += f"\n... and {len(file_list) - max_items} more files"

    return tree


def format_key_files(key_files: List[dict], max_content_length: int = 2000) -> str:
    """Format key files content for the prompt."""
    if not key_files:
        return "(no key files available)"

    parts = []
    for f in key_files:
        path = f.get("path", "unknown")
        content = f.get("content", "")
        if content:
            # Truncate long content
            if len(content) > max_content_length:
                content = content[:max_content_length] + "\n... (truncated)"
            parts.append(f"### {path}\n```\n{content}\n```")
        else:
            parts.append(f"### {path}\n(content not available)")

    return "\n\n".join(parts)


def format_dependencies(repo_analysis: dict) -> str:
    """Format package dependencies."""
    parts = []

    package_json = repo_analysis.get("package_json")
    if package_json:
        deps = package_json.get("dependencies", {})
        dev_deps = package_json.get("devDependencies", {})
        if deps:
            parts.append("### package.json dependencies")
            parts.append(json.dumps(deps, indent=2))
        if dev_deps:
            parts.append("### package.json devDependencies")
            parts.append(json.dumps(dev_deps, indent=2))

    requirements = repo_analysis.get("requirements_txt")
    if requirements:
        parts.append("### requirements.txt")
        parts.append(requirements)

    return "\n\n".join(parts) if parts else "(no dependencies found)"


async def code_analyzer_agent(state: FeatureDiscoveryState) -> Dict[str, Any]:
    """
    Code Analyzer Agent: Analyzes repository structure and patterns.

    Uses GPT-5.2 for deep reasoning about code architecture.

    Args:
        state: Current feature discovery state

    Returns:
        Dict with code_analysis and updated state fields
    """
    logger.info("[CodeAnalyzer] Starting repository analysis")

    repo_analysis = state["repo_analysis"]
    user_context = state.get("user_context")

    # Build prompt from template
    user_context_section = ""
    if user_context:
        user_context_section = f"\n## User Guidance\n{user_context}\n"

    prompt = CODE_ANALYZER_PROMPT.format(
        owner=repo_analysis.get("owner", "unknown"),
        repo_name=repo_analysis.get("repo_name", "unknown"),
        branch=repo_analysis.get("branch", "main"),
        language=repo_analysis.get("language", "unknown"),
        description=repo_analysis.get("description", "(no description)"),
        topics=", ".join(repo_analysis.get("topics", [])) or "(none)",
        file_tree=format_file_tree(repo_analysis.get("file_tree", [])),
        readme_content=repo_analysis.get("readme_content", "(no README)") or "(no README)",
        key_files_content=format_key_files(repo_analysis.get("key_files", [])),
        dependencies=format_dependencies(repo_analysis),
        user_context_section=user_context_section,
    )

    client = get_openai_client()

    try:
        response = await client.beta.chat.completions.parse(
            model=settings.MODEL_FEATURE_CODE_ANALYZER,
            reasoning_effort="medium",
            messages=[
                {"role": "system", "content": CODE_ANALYZER_SYSTEM},
                {"role": "user", "content": prompt}
            ],
            response_format=CodeAnalysisResult,
        )

        analysis = response.choices[0].message.parsed

        logger.info(
            f"[CodeAnalyzer] Analysis complete: {analysis.architecture_type}, "
            f"{len(analysis.key_components)} components, {len(analysis.existing_features)} features"
        )

        return {
            "code_analysis": analysis.model_dump(),
            "current_agent": "code_analyzer",
            "agent_history": ["code_analyzer"],
            "status": "in_progress",
            "messages": [{
                "role": "system",
                "content": f"[CodeAnalyzer] Analyzed {analysis.architecture_type} architecture with {len(analysis.key_components)} components"
            }]
        }

    except Exception as e:
        logger.error(f"[CodeAnalyzer] Error: {e}", exc_info=True)

        # Fallback analysis
        fallback = CodeAnalysisResult(
            architecture_type="unknown",
            primary_domain=repo_analysis.get("description", "software project")[:100],
            key_components=[],
            existing_features=[],
            tech_stack_summary=f"Primary language: {repo_analysis.get('language', 'unknown')}",
            code_patterns=[],
            pain_points=[],
            readme_insights=None,
            todo_comments=[],
        )

        return {
            "code_analysis": fallback.model_dump(),
            "current_agent": "code_analyzer",
            "agent_history": ["code_analyzer"],
            "status": "in_progress",
            "error_message": str(e),
            "messages": [{
                "role": "system",
                "content": f"[CodeAnalyzer] Fallback analysis used: {str(e)}"
            }]
        }
