"""
Feature Discoverer Agent

Identifies potential features from code analysis.
Uses GPT-5.2 for feature identification.
"""

import json
import logging
from typing import Any, Dict, List

from pydantic import BaseModel, Field

from app.config import settings
from app.core.ai.client import get_openai_client
from app.core.ai.feature_discovery.state import (
    FeatureDiscoveryState,
    DiscoveredFeature,
    FeatureCategory,
    FeatureSource,
)
from app.core.ai.prompts.feature_discovery.feature_discoverer import (
    FEATURE_DISCOVERER_SYSTEM,
    FEATURE_DISCOVERER_PROMPT,
)

logger = logging.getLogger(__name__)


class DiscoveredFeaturesResponse(BaseModel):
    """Response format for feature discoverer."""
    features: List[DiscoveredFeature] = Field(default_factory=list)


async def feature_discoverer_agent(state: FeatureDiscoveryState) -> Dict[str, Any]:
    """
    Feature Discoverer Agent: Identifies potential features.

    Uses GPT-5.2 for feature identification from code analysis.

    Args:
        state: Current feature discovery state

    Returns:
        Dict with discovered_features and updated state fields
    """
    logger.info("[FeatureDiscoverer] Starting feature discovery")

    code_analysis = state.get("code_analysis", {})
    repo_analysis = state["repo_analysis"]
    user_context = state.get("user_context")
    max_features = state.get("max_features", 15)
    existing_features = state.get("existing_features", [])

    # Format existing features for the prompt
    existing_features_str = "\n".join([
        f"- {f.get('title', 'Untitled')}"
        for f in existing_features
    ]) if existing_features else "(none)"

    user_context_section = ""
    if user_context:
        user_context_section = f"\n## User Guidance\n{user_context}\n"

    prompt = FEATURE_DISCOVERER_PROMPT.format(
        code_analysis=json.dumps(code_analysis, indent=2),
        owner=repo_analysis.get("owner", "unknown"),
        repo_name=repo_analysis.get("repo_name", "unknown"),
        primary_domain=code_analysis.get("primary_domain", "software project"),
        architecture_type=code_analysis.get("architecture_type", "unknown"),
        existing_features=existing_features_str,
        user_context_section=user_context_section,
        max_features=max_features,
    )

    client = get_openai_client()

    try:
        response = await client.beta.chat.completions.parse(
            model=settings.MODEL_FEATURE_DISCOVERER,
            reasoning_effort="medium",
            messages=[
                {"role": "system", "content": FEATURE_DISCOVERER_SYSTEM},
                {"role": "user", "content": prompt}
            ],
            response_format=DiscoveredFeaturesResponse,
        )

        result = response.choices[0].message.parsed
        features = [f.model_dump() for f in result.features]

        logger.info(f"[FeatureDiscoverer] Discovered {len(features)} features")

        return {
            "discovered_features": features,
            "current_agent": "feature_discoverer",
            "agent_history": state.get("agent_history", []) + ["feature_discoverer"],
            "messages": [{
                "role": "system",
                "content": f"[FeatureDiscoverer] Discovered {len(features)} potential features"
            }]
        }

    except Exception as e:
        logger.error(f"[FeatureDiscoverer] Error: {e}", exc_info=True)

        return {
            "discovered_features": [],
            "current_agent": "feature_discoverer",
            "agent_history": state.get("agent_history", []) + ["feature_discoverer"],
            "error_message": str(e),
            "messages": [{
                "role": "system",
                "content": f"[FeatureDiscoverer] Error: {str(e)}"
            }]
        }
