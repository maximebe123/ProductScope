"""
Feature Extraction Streaming Handler

Orchestrates the feature extraction multi-agent pipeline with real-time streaming
of reasoning tokens from each agent.

The pipeline flows: CodeAnalyzer → FeatureExtractor → FeatureEnricher

This extracts EXISTING features from the codebase, not suggesting new ones.
"""

import json
import logging
from typing import Any, AsyncGenerator, Dict, List, Optional

from app.config import settings
from app.core.ai.feature_extraction.state import (
    CodeAnalysisResult,
    ExtractedFeaturesResponse,
    EnrichedFeaturesResponse,
    CandidateFeature,
)
from app.core.ai.prompts.feature_extraction.code_analyzer import (
    CODE_ANALYZER_SYSTEM,
    CODE_ANALYZER_PROMPT,
)
from app.core.ai.prompts.feature_extraction.feature_extractor import (
    FEATURE_EXTRACTOR_SYSTEM,
    FEATURE_EXTRACTOR_PROMPT,
)
from app.core.ai.prompts.feature_extraction.feature_enricher import (
    FEATURE_ENRICHER_SYSTEM,
    FEATURE_ENRICHER_PROMPT,
)
from app.services.streaming_agent_executor import stream_with_structured_output
from app.utils.repository_formatting import (
    format_file_tree,
    format_key_files,
    format_dependencies,
)

logger = logging.getLogger(__name__)


# Agent descriptions for UI display
AGENT_DESCRIPTIONS = {
    "code_analyzer": "Analyzing codebase structure and modules",
    "feature_extractor": "Identifying implemented features",
    "feature_enricher": "Enriching feature specifications",
}

# Agent weights for progress calculation (sum = 100)
AGENT_WEIGHTS = {
    "code_analyzer": 35,
    "feature_extractor": 35,
    "feature_enricher": 30,
}


def format_extracted_features(features: List[dict]) -> str:
    """Format extracted features for enrichment."""
    if not features:
        return "(none)"
    parts = []
    for f in features:
        parts.append(f"### {f.get('temp_id', 'unknown')}: {f.get('title', 'Untitled')}")
        parts.append(f"**Description**: {f.get('description', 'N/A')}")
        parts.append(f"**Completeness**: {f.get('completeness', 'unknown')}")
        parts.append(f"**Complexity**: {f.get('estimated_complexity', 'unknown')}")
        if f.get("modules_involved"):
            parts.append(f"**Modules**: {', '.join(f.get('modules_involved', []))}")
        if f.get("key_files"):
            parts.append(f"**Key Files**: {', '.join(f.get('key_files', [])[:5])}")
        parts.append("")
    return "\n".join(parts)


async def execute_feature_extraction_with_streaming(
    repo_analysis: dict,
    project_id: str,
    user_context: Optional[str] = None,
    focus_areas: Optional[List[str]] = None,
    max_features: int = 20,
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Execute the feature extraction pipeline with real-time streaming.

    Yields events as each agent processes:
    - agent_start: When an agent begins
    - reasoning: GPT reasoning tokens
    - content: Response content tokens
    - agent_complete: When an agent finishes
    - feature_preview: Preview of extracted feature
    - progress: Progress update (0-100)
    - complete: Final candidate features
    - error: If something fails

    Args:
        repo_analysis: Repository analysis data from GitHub
        project_id: The project ID
        user_context: Optional user guidance
        focus_areas: Areas to focus on (e.g., ["api", "frontend"])
        max_features: Maximum features to extract

    Yields:
        Streaming events for the frontend
    """
    logger.info(f"[FeatureExtraction] Starting pipeline for project {project_id}")

    # Track state
    state: Dict[str, Any] = {
        "repo_analysis": repo_analysis,
        "project_id": project_id,
        "user_context": user_context,
        "focus_areas": focus_areas or [],
        "max_features": max_features,
        "code_analysis": None,
        "extracted_features": [],
        "enriched_features": [],
        "candidate_features": [],
    }

    progress = 0

    def update_progress(agent: str):
        nonlocal progress
        progress += AGENT_WEIGHTS.get(agent, 10)
        return min(progress, 100)

    try:
        # ===== CODE ANALYZER AGENT =====
        yield {
            "type": "agent_start",
            "agent": "code_analyzer",
            "description": AGENT_DESCRIPTIONS["code_analyzer"]
        }

        user_context_section = ""
        if user_context:
            user_context_section = f"\n## User Guidance\n{user_context}\n"
        if focus_areas:
            user_context_section += f"\n## Focus Areas\n- " + "\n- ".join(focus_areas) + "\n"

        code_analyzer_prompt = CODE_ANALYZER_PROMPT.format(
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

        code_analysis = None
        async for event in stream_with_structured_output(
            messages=[
                {"role": "system", "content": CODE_ANALYZER_SYSTEM},
                {"role": "user", "content": code_analyzer_prompt}
            ],
            model=settings.MODEL_FEATURE_CODE_ANALYZER,
            response_model=CodeAnalysisResult,
            agent_name="code_analyzer",
        ):
            if event["type"] == "reasoning":
                yield {"type": "reasoning", "agent": "code_analyzer", "token": event.get("token", "")}
            elif event["type"] == "content":
                yield {"type": "content", "agent": "code_analyzer", "token": event.get("token", "")}
            elif event["type"] == "parsed":
                code_analysis = event["data"]

        if not code_analysis:
            raise ValueError("Code analyzer failed to produce result")

        state["code_analysis"] = code_analysis.model_dump() if hasattr(code_analysis, "model_dump") else code_analysis

        # Count identified features from code analysis
        identified_count = len(state["code_analysis"].get("identified_features", []))

        yield {
            "type": "agent_complete",
            "agent": "code_analyzer",
            "summary": f"Analyzed {code_analysis.architecture_type} architecture, found {identified_count} potential features",
            "progress": update_progress("code_analyzer"),
        }

        # ===== FEATURE EXTRACTOR AGENT =====
        yield {
            "type": "agent_start",
            "agent": "feature_extractor",
            "description": AGENT_DESCRIPTIONS["feature_extractor"]
        }

        extractor_prompt = FEATURE_EXTRACTOR_PROMPT.format(
            code_analysis=json.dumps(state["code_analysis"], indent=2),
            user_context_section=user_context_section,
        )

        extracted_features = []
        async for event in stream_with_structured_output(
            messages=[
                {"role": "system", "content": FEATURE_EXTRACTOR_SYSTEM},
                {"role": "user", "content": extractor_prompt}
            ],
            model=settings.MODEL_FEATURE_DISCOVERER,  # Use same model as discoverer
            response_model=ExtractedFeaturesResponse,
            agent_name="feature_extractor",
        ):
            if event["type"] == "reasoning":
                yield {"type": "reasoning", "agent": "feature_extractor", "token": event.get("token", "")}
            elif event["type"] == "content":
                yield {"type": "content", "agent": "feature_extractor", "token": event.get("token", "")}
            elif event["type"] == "parsed":
                extracted_features = [f.model_dump() for f in event["data"].extracted_features]

        state["extracted_features"] = extracted_features

        # Yield previews
        for f in extracted_features:
            yield {
                "type": "feature_preview",
                "temp_id": f.get("temp_id"),
                "title": f.get("title"),
                "category": "extracted",
            }

        yield {
            "type": "agent_complete",
            "agent": "feature_extractor",
            "summary": f"Extracted {len(extracted_features)} distinct features",
            "count": len(extracted_features),
            "progress": update_progress("feature_extractor"),
        }

        # ===== FEATURE ENRICHER AGENT =====
        yield {
            "type": "agent_start",
            "agent": "feature_enricher",
            "description": AGENT_DESCRIPTIONS["feature_enricher"]
        }

        if not extracted_features:
            yield {
                "type": "agent_complete",
                "agent": "feature_enricher",
                "summary": "No features to enrich",
                "count": 0,
                "progress": 100,
            }
            yield {
                "type": "complete",
                "features": [],
                "total": 0,
            }
            return

        # Format tech stack for enricher
        tech_stack = state["code_analysis"].get("tech_stack", {})
        tech_stack_str = json.dumps(tech_stack, indent=2) if isinstance(tech_stack, dict) else str(tech_stack)

        enricher_prompt = FEATURE_ENRICHER_PROMPT.format(
            primary_domain=code_analysis.primary_domain,
            architecture_type=code_analysis.architecture_type,
            tech_stack=tech_stack_str,
            extracted_features=format_extracted_features(extracted_features),
            user_context_section=user_context_section,
        )

        enriched_features = []
        async for event in stream_with_structured_output(
            messages=[
                {"role": "system", "content": FEATURE_ENRICHER_SYSTEM},
                {"role": "user", "content": enricher_prompt}
            ],
            model=settings.MODEL_FEATURE_ENRICHER,
            response_model=EnrichedFeaturesResponse,
            agent_name="feature_enricher",
        ):
            if event["type"] == "reasoning":
                yield {"type": "reasoning", "agent": "feature_enricher", "token": event.get("token", "")}
            elif event["type"] == "content":
                yield {"type": "content", "agent": "feature_enricher", "token": event.get("token", "")}
            elif event["type"] == "parsed":
                enriched_features = [f.model_dump() for f in event["data"].features]

        state["enriched_features"] = enriched_features

        # Convert to candidate features
        candidates = []
        for f in enriched_features:
            candidate = CandidateFeature(
                temp_id=f.get("temp_id", "unknown"),
                title=f.get("title", "Untitled"),
                problem=f.get("problem", ""),
                solution=f.get("solution", ""),
                target_users=f.get("target_users", ""),
                success_metrics=f.get("success_metrics", ""),
                technical_notes=f.get("technical_notes"),
                priority=f.get("priority", "medium"),
                priority_score=f.get("priority_score", 50),
                effort_estimate=f.get("effort_estimate", "medium"),
                impact_estimate=f.get("impact_estimate", "medium"),
                tags=f.get("tags", []),
                category=f.get("category", "core"),
                source="extracted",
            )
            candidates.append(candidate.model_dump())

        # Sort by priority score
        candidates.sort(key=lambda x: x["priority_score"], reverse=True)

        # Limit to max_features
        candidates = candidates[:max_features]

        state["candidate_features"] = candidates

        yield {
            "type": "agent_complete",
            "agent": "feature_enricher",
            "summary": f"Enriched {len(candidates)} features with specifications",
            "count": len(candidates),
            "progress": 100,
        }

        # ===== COMPLETE =====
        yield {
            "type": "complete",
            "features": candidates,
            "total": len(candidates),
        }

        logger.info(f"[FeatureExtraction] Pipeline complete: {len(candidates)} candidates")

    except Exception as e:
        logger.error(f"[FeatureExtraction] Pipeline error: {e}", exc_info=True)
        yield {
            "type": "error",
            "message": str(e),
        }
