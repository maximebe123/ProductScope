"""
Feature Discovery Streaming Handler

Orchestrates the feature discovery multi-agent pipeline with real-time streaming
of reasoning tokens from each agent.

The pipeline flows: CodeAnalyzer → FeatureDiscoverer → [GapAnalyst ∥ TechDebtAnalyst] → FeatureEnricher → PriorityRanker

Each agent's reasoning and content is streamed as events for the frontend to display.
"""

import asyncio
import json
import logging
from typing import Any, AsyncGenerator, Dict, List, Optional

from pydantic import BaseModel, Field, ValidationError

from app.config import settings
from app.core.ai.feature_discovery.state import (
    FeatureDiscoveryState,
    create_initial_discovery_state,
    CodeAnalysisResult,
    DiscoveredFeature,
    GapFeature,
    TechDebtFeature,
    EnrichedFeature,
    RankedFeature,
    CandidateFeature,
    RepoAnalysis,
)
from app.core.ai.prompts.feature_discovery.code_analyzer import (
    CODE_ANALYZER_SYSTEM,
    CODE_ANALYZER_PROMPT,
)
from app.core.ai.prompts.feature_discovery.feature_discoverer import (
    FEATURE_DISCOVERER_SYSTEM,
    FEATURE_DISCOVERER_PROMPT,
)
from app.core.ai.prompts.feature_discovery.gap_analyst import (
    GAP_ANALYST_SYSTEM,
    GAP_ANALYST_PROMPT,
)
from app.core.ai.prompts.feature_discovery.tech_debt_analyst import (
    TECH_DEBT_ANALYST_SYSTEM,
    TECH_DEBT_ANALYST_PROMPT,
)
from app.core.ai.prompts.feature_discovery.feature_enricher import (
    FEATURE_ENRICHER_SYSTEM,
    FEATURE_ENRICHER_PROMPT,
)
from app.core.ai.prompts.feature_discovery.priority_ranker import (
    PRIORITY_RANKER_SYSTEM,
    PRIORITY_RANKER_PROMPT,
)
from app.services.streaming_agent_executor import (
    stream_with_structured_output,
    stream_without_structured_output,
)
from app.utils.repository_formatting import (
    format_file_tree,
    format_key_files,
    format_dependencies,
)

logger = logging.getLogger(__name__)


# Agent descriptions for UI display
AGENT_DESCRIPTIONS = {
    "code_analyzer": "Analyzing repository structure and patterns",
    "feature_discoverer": "Discovering potential features from code",
    "gap_analyst": "Comparing with best practices",
    "tech_debt_analyst": "Identifying technical improvements",
    "feature_enricher": "Adding detailed specifications",
    "priority_ranker": "Ranking features by priority",
}

# Agent weights for progress calculation (sum = 100)
AGENT_WEIGHTS = {
    "code_analyzer": 20,
    "feature_discoverer": 25,
    "gap_analyst": 10,
    "tech_debt_analyst": 10,
    "feature_enricher": 25,
    "priority_ranker": 10,
}


class DiscoveredFeaturesResponse(BaseModel):
    """Response format for feature discoverer."""
    features: List[DiscoveredFeature] = Field(default_factory=list)


class GapFeaturesResponse(BaseModel):
    """Response format for gap analyst."""
    features: List[GapFeature] = Field(default_factory=list)


class TechDebtFeaturesResponse(BaseModel):
    """Response format for tech debt analyst."""
    features: List[TechDebtFeature] = Field(default_factory=list)


class EnrichedFeaturesResponse(BaseModel):
    """Response format for feature enricher."""
    features: List[EnrichedFeature] = Field(default_factory=list)


def format_features_for_enrichment(features: List[dict], source_type: str) -> str:
    """Format features for the enrichment prompt."""
    if not features:
        return "(none)"
    parts = []
    for f in features:
        parts.append(f"- **{f.get('temp_id', 'unknown')}**: {f.get('title', 'Untitled')}")
        if f.get("evidence"):
            parts.append(f"  Evidence: {f.get('evidence')[:200]}")
        if f.get("rationale"):
            parts.append(f"  Rationale: {f.get('rationale')[:200]}")
        if f.get("category"):
            parts.append(f"  Category: {f.get('category')}")
    return "\n".join(parts)


def format_enriched_features(features: List[dict]) -> str:
    """Format enriched features for ranking."""
    if not features:
        return "(none)"
    parts = []
    for f in features:
        parts.append(f"### {f.get('temp_id', 'unknown')}: {f.get('title', 'Untitled')}")
        parts.append(f"**Category**: {f.get('category', 'unknown')}")
        parts.append(f"**Source**: {f.get('source', 'unknown')}")
        parts.append(f"**Problem**: {f.get('problem', 'N/A')}")
        parts.append(f"**Solution**: {f.get('solution', 'N/A')}")
        parts.append(f"**Target Users**: {f.get('target_users', 'N/A')}")
        parts.append(f"**Success Metrics**: {f.get('success_metrics', 'N/A')}")
        if f.get("technical_notes"):
            parts.append(f"**Technical Notes**: {f.get('technical_notes')}")
        parts.append("")
    return "\n".join(parts)


def merge_ranking_with_enriched(enriched: List[dict], rankings: List[dict]) -> List[dict]:
    """Merge ranking data with enriched features to create candidates."""
    ranking_by_id = {r["temp_id"]: r for r in rankings}
    candidates = []
    for f in enriched:
        temp_id = f.get("temp_id")
        ranking = ranking_by_id.get(temp_id, {})
        candidate = CandidateFeature(
            temp_id=temp_id or "unknown",
            title=f.get("title", "Untitled"),
            problem=f.get("problem", ""),
            solution=f.get("solution", ""),
            target_users=f.get("target_users", ""),
            success_metrics=f.get("success_metrics", ""),
            technical_notes=f.get("technical_notes"),
            priority=ranking.get("priority", "medium"),
            priority_score=ranking.get("priority_score", 50),
            effort_estimate=ranking.get("effort_estimate", "medium"),
            impact_estimate=ranking.get("impact_estimate", "medium"),
            tags=f.get("tags", []),
            category=str(f.get("category", "user_facing")),
            source=str(f.get("source", "code_pattern")),
        )
        candidates.append(candidate.model_dump())
    candidates.sort(key=lambda x: x["priority_score"], reverse=True)
    return candidates


async def execute_feature_discovery_with_streaming(
    repo_analysis: dict,
    project_id: str,
    existing_features: Optional[List[dict]] = None,
    user_context: Optional[str] = None,
    max_features: int = 15,
    include_tech_debt: bool = True,
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Execute the feature discovery pipeline with real-time streaming.

    Yields events as each agent processes:
    - agent_start: When an agent begins
    - reasoning: GPT-5 thinking tokens
    - content: Response content tokens
    - agent_complete: When an agent finishes
    - feature_preview: Preview of discovered feature
    - progress: Progress update (0-100)
    - complete: Final candidate features
    - error: If something fails

    Args:
        repo_analysis: Repository analysis data from GitHub
        project_id: The project ID
        existing_features: Features already in the project
        user_context: Optional user guidance
        max_features: Maximum features to discover
        include_tech_debt: Whether to include tech debt features

    Yields:
        Streaming events for the frontend
    """
    logger.info(f"[FeatureDiscovery] Starting pipeline for project {project_id}")

    # Track state
    state: Dict[str, Any] = {
        "repo_analysis": repo_analysis,
        "project_id": project_id,
        "existing_features": existing_features or [],
        "user_context": user_context,
        "max_features": max_features,
        "include_tech_debt": include_tech_debt,
        "code_analysis": None,
        "discovered_features": [],
        "gap_features": [],
        "tech_debt_features": [],
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

        user_context_section = f"\n## User Guidance\n{user_context}\n" if user_context else ""

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

        yield {
            "type": "agent_complete",
            "agent": "code_analyzer",
            "summary": f"Analyzed {code_analysis.architecture_type} architecture with {len(code_analysis.key_components)} components",
            "progress": update_progress("code_analyzer"),
        }

        # ===== FEATURE DISCOVERER AGENT =====
        yield {
            "type": "agent_start",
            "agent": "feature_discoverer",
            "description": AGENT_DESCRIPTIONS["feature_discoverer"]
        }

        existing_features_str = "\n".join([
            f"- {f.get('title', 'Untitled')}"
            for f in (existing_features or [])
        ]) or "(none)"

        discoverer_prompt = FEATURE_DISCOVERER_PROMPT.format(
            code_analysis=json.dumps(state["code_analysis"], indent=2),
            owner=repo_analysis.get("owner", "unknown"),
            repo_name=repo_analysis.get("repo_name", "unknown"),
            primary_domain=code_analysis.primary_domain,
            architecture_type=code_analysis.architecture_type,
            existing_features=existing_features_str,
            user_context_section=user_context_section,
            max_features=max_features,
        )

        discovered_features = []
        async for event in stream_with_structured_output(
            messages=[
                {"role": "system", "content": FEATURE_DISCOVERER_SYSTEM},
                {"role": "user", "content": discoverer_prompt}
            ],
            model=settings.MODEL_FEATURE_DISCOVERER,
            response_model=DiscoveredFeaturesResponse,
            agent_name="feature_discoverer",
        ):
            if event["type"] == "reasoning":
                yield {"type": "reasoning", "agent": "feature_discoverer", "token": event.get("token", "")}
            elif event["type"] == "content":
                yield {"type": "content", "agent": "feature_discoverer", "token": event.get("token", "")}
            elif event["type"] == "parsed":
                discovered_features = [f.model_dump() for f in event["data"].features]

        state["discovered_features"] = discovered_features

        # Yield previews
        for f in discovered_features:
            yield {
                "type": "feature_preview",
                "temp_id": f.get("temp_id"),
                "title": f.get("title"),
                "category": f.get("category"),
            }

        yield {
            "type": "agent_complete",
            "agent": "feature_discoverer",
            "summary": f"Discovered {len(discovered_features)} potential features",
            "count": len(discovered_features),
            "progress": update_progress("feature_discoverer"),
        }

        # ===== PARALLEL: GAP ANALYST & TECH DEBT ANALYST =====
        gap_features = []
        tech_debt_features = []

        async def run_gap_analyst():
            nonlocal gap_features
            yield {
                "type": "agent_start",
                "agent": "gap_analyst",
                "description": AGENT_DESCRIPTIONS["gap_analyst"]
            }

            discovered_str = "\n".join([
                f"- {f.get('title', 'Untitled')}: {f.get('evidence', '')[:100]}"
                for f in discovered_features
            ]) or "(none)"

            max_gap_features = max(3, max_features // 3)

            gap_prompt = GAP_ANALYST_PROMPT.format(
                code_analysis=json.dumps(state["code_analysis"], indent=2),
                discovered_features=discovered_str,
                primary_domain=code_analysis.primary_domain,
                architecture_type=code_analysis.architecture_type,
                tech_stack_summary=code_analysis.tech_stack_summary,
                user_context_section=user_context_section,
                max_gap_features=max_gap_features,
            )

            async for event in stream_with_structured_output(
                messages=[
                    {"role": "system", "content": GAP_ANALYST_SYSTEM},
                    {"role": "user", "content": gap_prompt}
                ],
                model=settings.MODEL_FEATURE_GAP_ANALYST,
                response_model=GapFeaturesResponse,
                agent_name="gap_analyst",
            ):
                if event["type"] == "reasoning":
                    yield {"type": "reasoning", "agent": "gap_analyst", "token": event.get("token", "")}
                elif event["type"] == "parsed":
                    gap_features = [f.model_dump() for f in event["data"].features]

            yield {
                "type": "agent_complete",
                "agent": "gap_analyst",
                "summary": f"Identified {len(gap_features)} gap features",
                "count": len(gap_features),
                "progress": update_progress("gap_analyst"),
            }

        async def run_tech_debt_analyst():
            nonlocal tech_debt_features
            if not include_tech_debt:
                yield {
                    "type": "agent_complete",
                    "agent": "tech_debt_analyst",
                    "summary": "Skipped (disabled)",
                    "count": 0,
                    "progress": update_progress("tech_debt_analyst"),
                }
                return

            yield {
                "type": "agent_start",
                "agent": "tech_debt_analyst",
                "description": AGENT_DESCRIPTIONS["tech_debt_analyst"]
            }

            pain_points = state["code_analysis"].get("pain_points", [])
            pain_points_str = "\n".join([f"- {p}" for p in pain_points]) or "(none)"

            key_files = repo_analysis.get("key_files", [])
            key_files_str = "\n".join([
                f"- {f.get('path', 'unknown')}"
                for f in key_files[:20]
            ]) or "(no key files)"

            max_debt_features = max(2, max_features // 5)

            tech_debt_prompt = TECH_DEBT_ANALYST_PROMPT.format(
                code_analysis=json.dumps(state["code_analysis"], indent=2),
                pain_points=pain_points_str,
                architecture_type=code_analysis.architecture_type,
                tech_stack_summary=code_analysis.tech_stack_summary,
                key_files_summary=key_files_str,
                user_context_section=user_context_section,
                max_debt_features=max_debt_features,
            )

            async for event in stream_with_structured_output(
                messages=[
                    {"role": "system", "content": TECH_DEBT_ANALYST_SYSTEM},
                    {"role": "user", "content": tech_debt_prompt}
                ],
                model=settings.MODEL_FEATURE_TECH_DEBT,
                response_model=TechDebtFeaturesResponse,
                agent_name="tech_debt_analyst",
            ):
                if event["type"] == "reasoning":
                    yield {"type": "reasoning", "agent": "tech_debt_analyst", "token": event.get("token", "")}
                elif event["type"] == "parsed":
                    tech_debt_features = [f.model_dump() for f in event["data"].features]

            yield {
                "type": "agent_complete",
                "agent": "tech_debt_analyst",
                "summary": f"Identified {len(tech_debt_features)} tech debt items",
                "count": len(tech_debt_features),
                "progress": update_progress("tech_debt_analyst"),
            }

        # Run gap and tech debt in parallel
        async for event in run_gap_analyst():
            yield event

        async for event in run_tech_debt_analyst():
            yield event

        state["gap_features"] = gap_features
        state["tech_debt_features"] = tech_debt_features

        # ===== FEATURE ENRICHER AGENT =====
        yield {
            "type": "agent_start",
            "agent": "feature_enricher",
            "description": AGENT_DESCRIPTIONS["feature_enricher"]
        }

        all_raw_features = discovered_features + gap_features + tech_debt_features

        if not all_raw_features:
            yield {
                "type": "agent_complete",
                "agent": "feature_enricher",
                "summary": "No features to enrich",
                "count": 0,
                "progress": update_progress("feature_enricher"),
            }
            yield {
                "type": "complete",
                "features": [],
                "total": 0,
            }
            return

        enricher_prompt = FEATURE_ENRICHER_PROMPT.format(
            primary_domain=code_analysis.primary_domain,
            architecture_type=code_analysis.architecture_type,
            tech_stack_summary=code_analysis.tech_stack_summary,
            discovered_features=format_features_for_enrichment(discovered_features, "discovered"),
            gap_features=format_features_for_enrichment(gap_features, "gap"),
            tech_debt_features=format_features_for_enrichment(tech_debt_features, "tech_debt"),
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

        yield {
            "type": "agent_complete",
            "agent": "feature_enricher",
            "summary": f"Enriched {len(enriched_features)} features with specifications",
            "count": len(enriched_features),
            "progress": update_progress("feature_enricher"),
        }

        # ===== PRIORITY RANKER AGENT =====
        yield {
            "type": "agent_start",
            "agent": "priority_ranker",
            "description": AGENT_DESCRIPTIONS["priority_ranker"]
        }

        ranker_prompt = PRIORITY_RANKER_PROMPT.format(
            primary_domain=code_analysis.primary_domain,
            architecture_type=code_analysis.architecture_type,
            enriched_features=format_enriched_features(enriched_features),
            user_context_section=user_context_section,
        )

        rankings = []
        async for event in stream_without_structured_output(
            messages=[
                {"role": "system", "content": PRIORITY_RANKER_SYSTEM},
                {"role": "user", "content": ranker_prompt}
            ],
            model=settings.MODEL_FEATURE_RANKER,
            agent_name="priority_ranker",
        ):
            if event["type"] == "content":
                yield {"type": "content", "agent": "priority_ranker", "token": event.get("token", "")}
            elif event["type"] == "complete":
                try:
                    result = json.loads(event["content"])
                    rankings = result.get("rankings", [])
                except json.JSONDecodeError:
                    logger.error("[PriorityRanker] Failed to parse rankings")
                    rankings = []

        # Merge rankings with enriched features
        candidates = merge_ranking_with_enriched(enriched_features, rankings)
        state["candidate_features"] = candidates

        yield {
            "type": "agent_complete",
            "agent": "priority_ranker",
            "summary": f"Ranked {len(candidates)} features by priority",
            "count": len(candidates),
            "progress": 100,
        }

        # ===== COMPLETE =====
        yield {
            "type": "complete",
            "features": candidates,
            "total": len(candidates),
        }

        logger.info(f"[FeatureDiscovery] Pipeline complete: {len(candidates)} candidates")

    except Exception as e:
        logger.error(f"[FeatureDiscovery] Pipeline error: {e}", exc_info=True)
        yield {
            "type": "error",
            "message": str(e),
        }
