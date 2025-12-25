"""
Feature Enricher Agent

Expands each discovered feature with full specification details.
Uses GPT-5.2 for comprehensive enrichment.
"""

import json
import logging
from typing import Any, Dict, List

from pydantic import BaseModel, Field

from app.config import settings
from app.core.ai.client import get_openai_client
from app.core.ai.feature_discovery.state import (
    FeatureDiscoveryState,
    EnrichedFeature,
    FeatureCategory,
    FeatureSource,
)
from app.core.ai.prompts.feature_discovery.feature_enricher import (
    FEATURE_ENRICHER_SYSTEM,
    FEATURE_ENRICHER_PROMPT,
)

logger = logging.getLogger(__name__)


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


async def feature_enricher_agent(state: FeatureDiscoveryState) -> Dict[str, Any]:
    """
    Feature Enricher Agent: Adds full specifications to features.

    Uses GPT-5.2 for comprehensive feature enrichment.

    Args:
        state: Current feature discovery state

    Returns:
        Dict with enriched_features and updated state fields
    """
    logger.info("[FeatureEnricher] Starting feature enrichment")

    code_analysis = state.get("code_analysis", {})
    discovered_features = state.get("discovered_features", [])
    gap_features = state.get("gap_features", [])
    tech_debt_features = state.get("tech_debt_features", [])
    user_context = state.get("user_context")

    # Check if we have features to enrich
    total_features = len(discovered_features) + len(gap_features) + len(tech_debt_features)
    if total_features == 0:
        logger.warning("[FeatureEnricher] No features to enrich")
        return {
            "enriched_features": [],
            "current_agent": "feature_enricher",
            "agent_history": state.get("agent_history", []) + ["feature_enricher"],
            "messages": [{
                "role": "system",
                "content": "[FeatureEnricher] No features to enrich"
            }]
        }

    user_context_section = ""
    if user_context:
        user_context_section = f"\n## User Guidance\n{user_context}\n"

    prompt = FEATURE_ENRICHER_PROMPT.format(
        primary_domain=code_analysis.get("primary_domain", "software project"),
        architecture_type=code_analysis.get("architecture_type", "unknown"),
        tech_stack_summary=code_analysis.get("tech_stack_summary", ""),
        discovered_features=format_features_for_enrichment(discovered_features, "discovered"),
        gap_features=format_features_for_enrichment(gap_features, "gap"),
        tech_debt_features=format_features_for_enrichment(tech_debt_features, "tech_debt"),
        user_context_section=user_context_section,
    )

    client = get_openai_client()

    try:
        response = await client.beta.chat.completions.parse(
            model=settings.MODEL_FEATURE_ENRICHER,
            reasoning_effort="medium",
            messages=[
                {"role": "system", "content": FEATURE_ENRICHER_SYSTEM},
                {"role": "user", "content": prompt}
            ],
            response_format=EnrichedFeaturesResponse,
        )

        result = response.choices[0].message.parsed
        features = [f.model_dump() for f in result.features]

        logger.info(f"[FeatureEnricher] Enriched {len(features)} features")

        return {
            "enriched_features": features,
            "current_agent": "feature_enricher",
            "agent_history": state.get("agent_history", []) + ["feature_enricher"],
            "messages": [{
                "role": "system",
                "content": f"[FeatureEnricher] Enriched {len(features)} features with full specifications"
            }]
        }

    except Exception as e:
        logger.error(f"[FeatureEnricher] Error: {e}", exc_info=True)

        # Fallback: create minimal enrichments from raw features
        fallback_enriched = []
        for f in discovered_features + gap_features + tech_debt_features:
            fallback_enriched.append({
                "temp_id": f.get("temp_id", "unknown"),
                "title": f.get("title", "Untitled"),
                "problem": f.get("evidence", f.get("rationale", "No problem description available")),
                "solution": "To be defined",
                "target_users": "To be defined",
                "success_metrics": "To be defined",
                "technical_notes": None,
                "category": f.get("category", "user_facing"),
                "source": f.get("source", "code_pattern"),
                "tags": [],
            })

        return {
            "enriched_features": fallback_enriched,
            "current_agent": "feature_enricher",
            "agent_history": state.get("agent_history", []) + ["feature_enricher"],
            "error_message": str(e),
            "messages": [{
                "role": "system",
                "content": f"[FeatureEnricher] Fallback enrichment used: {str(e)}"
            }]
        }
