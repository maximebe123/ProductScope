"""
Code Analyzer Agent

Analyzes the repository structure, patterns, and existing features.
Uses GPT-5.2 for deep reasoning about code architecture.
"""

import logging
from typing import Any, Dict

from app.config import settings
from app.core.ai.client import get_openai_client
from app.core.ai.feature_discovery.state import FeatureDiscoveryState, CodeAnalysisResult
from app.core.ai.prompts.feature_discovery.code_analyzer import (
    CODE_ANALYZER_SYSTEM,
    CODE_ANALYZER_PROMPT,
)
from app.utils.repository_formatting import (
    format_file_tree,
    format_key_files,
    format_dependencies,
)

logger = logging.getLogger(__name__)


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
