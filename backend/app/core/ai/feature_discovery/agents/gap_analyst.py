"""
Gap Analyst Agent

Identifies missing features by comparing to best practices.
Uses GPT-5.2-mini for efficiency.
"""

import json
import logging
from typing import Any, Dict, List

from openai import AsyncOpenAI
from pydantic import BaseModel, Field

from app.config import settings
from app.core.ai.feature_discovery.state import (
    FeatureDiscoveryState,
    GapFeature,
    FeatureCategory,
)
from app.core.ai.prompts.feature_discovery.gap_analyst import (
    GAP_ANALYST_SYSTEM,
    GAP_ANALYST_PROMPT,
)

logger = logging.getLogger(__name__)

_client = None


def get_openai_client() -> AsyncOpenAI:
    """Get or create OpenAI client singleton."""
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


class GapFeaturesResponse(BaseModel):
    """Response format for gap analyst."""
    features: List[GapFeature] = Field(default_factory=list)


async def gap_analyst_agent(state: FeatureDiscoveryState) -> Dict[str, Any]:
    """
    Gap Analyst Agent: Identifies missing features.

    Uses GPT-5.2-mini for best practice comparison.

    Args:
        state: Current feature discovery state

    Returns:
        Dict with gap_features and updated state fields
    """
    logger.info("[GapAnalyst] Starting gap analysis")

    code_analysis = state.get("code_analysis", {})
    discovered_features = state.get("discovered_features", [])
    user_context = state.get("user_context")
    max_features = state.get("max_features", 15)

    # Limit gap features to ~30% of max
    max_gap_features = max(3, max_features // 3)

    # Format discovered features
    discovered_str = "\n".join([
        f"- {f.get('title', 'Untitled')}: {f.get('evidence', '')[:100]}"
        for f in discovered_features
    ]) if discovered_features else "(none discovered yet)"

    user_context_section = ""
    if user_context:
        user_context_section = f"\n## User Guidance\n{user_context}\n"

    prompt = GAP_ANALYST_PROMPT.format(
        code_analysis=json.dumps(code_analysis, indent=2),
        discovered_features=discovered_str,
        primary_domain=code_analysis.get("primary_domain", "software project"),
        architecture_type=code_analysis.get("architecture_type", "unknown"),
        tech_stack_summary=code_analysis.get("tech_stack_summary", ""),
        user_context_section=user_context_section,
        max_gap_features=max_gap_features,
    )

    client = get_openai_client()

    try:
        response = await client.beta.chat.completions.parse(
            model=settings.MODEL_FEATURE_GAP_ANALYST,
            reasoning_effort="low",
            messages=[
                {"role": "system", "content": GAP_ANALYST_SYSTEM},
                {"role": "user", "content": prompt}
            ],
            response_format=GapFeaturesResponse,
        )

        result = response.choices[0].message.parsed
        features = [f.model_dump() for f in result.features]

        logger.info(f"[GapAnalyst] Identified {len(features)} gap features")

        return {
            "gap_features": features,
            "current_agent": "gap_analyst",
            "agent_history": state.get("agent_history", []) + ["gap_analyst"],
            "messages": [{
                "role": "system",
                "content": f"[GapAnalyst] Identified {len(features)} gap features"
            }]
        }

    except Exception as e:
        logger.error(f"[GapAnalyst] Error: {e}", exc_info=True)

        return {
            "gap_features": [],
            "current_agent": "gap_analyst",
            "agent_history": state.get("agent_history", []) + ["gap_analyst"],
            "error_message": str(e),
            "messages": [{
                "role": "system",
                "content": f"[GapAnalyst] Error: {str(e)}"
            }]
        }
