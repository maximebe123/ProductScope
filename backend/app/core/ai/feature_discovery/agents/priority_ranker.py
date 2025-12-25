"""
Priority Ranker Agent

Scores and ranks features by impact, effort, and priority.
Uses GPT-4o for fast prioritization.
"""

import json
import logging
from typing import Any, Dict, List

from pydantic import BaseModel, Field

from app.config import settings
from app.core.ai.client import get_openai_client
from app.core.ai.feature_discovery.state import (
    FeatureDiscoveryState,
    RankedFeature,
    CandidateFeature,
)
from app.core.ai.prompts.feature_discovery.priority_ranker import (
    PRIORITY_RANKER_SYSTEM,
    PRIORITY_RANKER_PROMPT,
)

logger = logging.getLogger(__name__)


class RankedFeaturesResponse(BaseModel):
    """Response format for priority ranker."""
    rankings: List[RankedFeature] = Field(default_factory=list)


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
        parts.append("")  # Empty line

    return "\n".join(parts)


def merge_ranking_with_enriched(
    enriched: List[dict],
    rankings: List[dict]
) -> List[dict]:
    """Merge ranking data with enriched features to create candidates."""
    # Build lookup by temp_id
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

    # Sort by priority score (highest first)
    candidates.sort(key=lambda x: x["priority_score"], reverse=True)

    return candidates


async def priority_ranker_agent(state: FeatureDiscoveryState) -> Dict[str, Any]:
    """
    Priority Ranker Agent: Scores and ranks features.

    Uses GPT-4o for fast prioritization.

    Args:
        state: Current feature discovery state

    Returns:
        Dict with ranked_features, candidate_features and updated state fields
    """
    logger.info("[PriorityRanker] Starting priority ranking")

    code_analysis = state.get("code_analysis", {})
    enriched_features = state.get("enriched_features", [])
    user_context = state.get("user_context")

    if not enriched_features:
        logger.warning("[PriorityRanker] No features to rank")
        return {
            "ranked_features": [],
            "candidate_features": [],
            "current_agent": "priority_ranker",
            "agent_history": state.get("agent_history", []) + ["priority_ranker"],
            "status": "success",
            "messages": [{
                "role": "system",
                "content": "[PriorityRanker] No features to rank"
            }]
        }

    user_context_section = ""
    if user_context:
        user_context_section = f"\n## User Guidance\n{user_context}\n"

    prompt = PRIORITY_RANKER_PROMPT.format(
        primary_domain=code_analysis.get("primary_domain", "software project"),
        architecture_type=code_analysis.get("architecture_type", "unknown"),
        enriched_features=format_enriched_features(enriched_features),
        user_context_section=user_context_section,
    )

    client = get_openai_client()

    try:
        response = await client.chat.completions.create(
            model=settings.MODEL_FEATURE_RANKER,
            messages=[
                {"role": "system", "content": PRIORITY_RANKER_SYSTEM},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
        )

        # Parse response
        content = response.choices[0].message.content
        result = json.loads(content)
        rankings = result.get("rankings", [])

        # Merge with enriched features
        candidates = merge_ranking_with_enriched(enriched_features, rankings)

        logger.info(f"[PriorityRanker] Ranked {len(candidates)} features")

        return {
            "ranked_features": rankings,
            "candidate_features": candidates,
            "current_agent": "priority_ranker",
            "agent_history": state.get("agent_history", []) + ["priority_ranker"],
            "status": "success",
            "messages": [{
                "role": "system",
                "content": f"[PriorityRanker] Ranked {len(candidates)} features"
            }]
        }

    except Exception as e:
        logger.error(f"[PriorityRanker] Error: {e}", exc_info=True)

        # Fallback: create basic rankings
        fallback_candidates = []
        for i, f in enumerate(enriched_features):
            fallback_candidates.append({
                "temp_id": f.get("temp_id", f"unknown_{i}"),
                "title": f.get("title", "Untitled"),
                "problem": f.get("problem", ""),
                "solution": f.get("solution", ""),
                "target_users": f.get("target_users", ""),
                "success_metrics": f.get("success_metrics", ""),
                "technical_notes": f.get("technical_notes"),
                "priority": "medium",
                "priority_score": 50,
                "effort_estimate": "medium",
                "impact_estimate": "medium",
                "tags": f.get("tags", []),
                "category": str(f.get("category", "user_facing")),
                "source": str(f.get("source", "code_pattern")),
            })

        return {
            "ranked_features": [],
            "candidate_features": fallback_candidates,
            "current_agent": "priority_ranker",
            "agent_history": state.get("agent_history", []) + ["priority_ranker"],
            "status": "success",
            "error_message": str(e),
            "messages": [{
                "role": "system",
                "content": f"[PriorityRanker] Fallback ranking used: {str(e)}"
            }]
        }
