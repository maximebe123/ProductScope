"""
Tech Debt Analyst Agent

Identifies technical debt items as features.
Uses GPT-5.2-mini for efficiency.
"""

import json
import logging
from typing import Any, Dict, List

from pydantic import BaseModel, Field

from app.config import settings
from app.core.ai.client import get_openai_client
from app.core.ai.feature_discovery.state import (
    FeatureDiscoveryState,
    TechDebtFeature,
    FeatureCategory,
)
from app.core.ai.prompts.feature_discovery.tech_debt_analyst import (
    TECH_DEBT_ANALYST_SYSTEM,
    TECH_DEBT_ANALYST_PROMPT,
)

logger = logging.getLogger(__name__)


class TechDebtFeaturesResponse(BaseModel):
    """Response format for tech debt analyst."""
    features: List[TechDebtFeature] = Field(default_factory=list)


async def tech_debt_analyst_agent(state: FeatureDiscoveryState) -> Dict[str, Any]:
    """
    Tech Debt Analyst Agent: Identifies technical improvements.

    Uses GPT-5.2-mini for tech debt analysis.

    Args:
        state: Current feature discovery state

    Returns:
        Dict with tech_debt_features and updated state fields
    """
    # Skip if tech debt analysis is disabled
    if not state.get("include_tech_debt", True):
        logger.info("[TechDebtAnalyst] Skipped (disabled)")
        return {
            "tech_debt_features": [],
            "current_agent": "tech_debt_analyst",
            "agent_history": state.get("agent_history", []) + ["tech_debt_analyst"],
            "messages": [{
                "role": "system",
                "content": "[TechDebtAnalyst] Skipped (disabled by user)"
            }]
        }

    logger.info("[TechDebtAnalyst] Starting tech debt analysis")

    code_analysis = state.get("code_analysis", {})
    repo_analysis = state["repo_analysis"]
    user_context = state.get("user_context")
    max_features = state.get("max_features", 15)

    # Limit tech debt features to ~20% of max
    max_debt_features = max(2, max_features // 5)

    # Format pain points
    pain_points = code_analysis.get("pain_points", [])
    pain_points_str = "\n".join([f"- {p}" for p in pain_points]) if pain_points else "(none identified)"

    # Format key files summary
    key_files = repo_analysis.get("key_files", [])
    key_files_str = "\n".join([
        f"- {f.get('path', 'unknown')}"
        for f in key_files[:20]
    ]) if key_files else "(no key files)"

    user_context_section = ""
    if user_context:
        user_context_section = f"\n## User Guidance\n{user_context}\n"

    prompt = TECH_DEBT_ANALYST_PROMPT.format(
        code_analysis=json.dumps(code_analysis, indent=2),
        pain_points=pain_points_str,
        architecture_type=code_analysis.get("architecture_type", "unknown"),
        tech_stack_summary=code_analysis.get("tech_stack_summary", ""),
        key_files_summary=key_files_str,
        user_context_section=user_context_section,
        max_debt_features=max_debt_features,
    )

    client = get_openai_client()

    try:
        response = await client.beta.chat.completions.parse(
            model=settings.MODEL_FEATURE_TECH_DEBT,
            reasoning_effort="low",
            messages=[
                {"role": "system", "content": TECH_DEBT_ANALYST_SYSTEM},
                {"role": "user", "content": prompt}
            ],
            response_format=TechDebtFeaturesResponse,
        )

        result = response.choices[0].message.parsed
        features = [f.model_dump() for f in result.features]

        logger.info(f"[TechDebtAnalyst] Identified {len(features)} tech debt items")

        return {
            "tech_debt_features": features,
            "current_agent": "tech_debt_analyst",
            "agent_history": state.get("agent_history", []) + ["tech_debt_analyst"],
            "messages": [{
                "role": "system",
                "content": f"[TechDebtAnalyst] Identified {len(features)} tech debt items"
            }]
        }

    except Exception as e:
        logger.error(f"[TechDebtAnalyst] Error: {e}", exc_info=True)

        return {
            "tech_debt_features": [],
            "current_agent": "tech_debt_analyst",
            "agent_history": state.get("agent_history", []) + ["tech_debt_analyst"],
            "error_message": str(e),
            "messages": [{
                "role": "system",
                "content": f"[TechDebtAnalyst] Error: {str(e)}"
            }]
        }
