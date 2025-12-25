"""
Grouping Strategist Agent

Creates logical groups for related components.
Uses GPT-5-mini for fast grouping decisions.
"""

import logging
from typing import Any, Dict, List

from openai import AsyncOpenAI
from pydantic import BaseModel

from app.config import settings
from app.core.ai.agent_state import MultiAgentState, GroupSpec
from app.core.ai.prompts.grouping_prompt import get_grouping_prompt

logger = logging.getLogger(__name__)

# Lazy-loaded OpenAI client
_client = None


def get_openai_client() -> AsyncOpenAI:
    """Get or create OpenAI client singleton."""
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


class GroupListResponse(BaseModel):
    """Wrapper for group list response"""
    groups: List[GroupSpec]


async def grouping_agent(state: MultiAgentState) -> Dict[str, Any]:
    """
    Grouping Strategist: Creates logical groups.

    Uses GPT-5-mini for fast grouping decisions.

    Args:
        state: Current multi-agent state

    Returns:
        Dict with groups list and updated state fields
    """
    logger.info("[Grouping] Starting group creation")

    components = state.get("components", [])
    architecture_plan = state.get("architecture_plan")

    if not components:
        logger.warning("[Grouping] No components to group")
        return {
            "groups": [],
            "messages": [{
                "role": "system",
                "content": "[Grouping] No components to group"
            }]
        }

    # Skip grouping for small diagrams
    if len(components) < 5:
        logger.info("[Grouping] Skipping groups for small diagram")
        return {
            "groups": [],
            # Note: current_agent not updated here to avoid parallel write conflict
            "messages": [{
                "role": "system",
                "content": "[Grouping] Skipped - small diagram"
            }]
        }

    # Get the specialized prompt
    prompt = get_grouping_prompt(components, architecture_plan)

    # Build user message
    user_message = """Analyze the components and create logical groups if needed.

Only create groups if they add organizational value.
Return a JSON object with a 'groups' array (can be empty)."""

    # Call GPT-5-mini for fast reasoning
    client = get_openai_client()

    try:
        # Note: GPT-5-mini reasoning models don't support temperature parameter
        response = await client.beta.chat.completions.parse(
            model=settings.MODEL_GROUPING,
            reasoning_effort="low",  # Fast grouping decisions
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": user_message}
            ],
            response_format=GroupListResponse,
        )

        result = response.choices[0].message.parsed
        groups = result.groups

        logger.info(f"[Grouping] Created {len(groups)} groups")

        for group in groups:
            logger.info(f"[Grouping] Group '{group.label}': {len(group.node_ids)} nodes")

        return {
            "groups": groups,
            # Note: current_agent not updated here to avoid parallel write conflict
            "messages": [{
                "role": "system",
                "content": f"[Grouping] Created {len(groups)} groups"
            }]
        }

    except Exception as e:
        logger.error(f"[Grouping] Error: {e}", exc_info=True)

        # Fallback: no groups (safe default)
        return {
            "groups": [],
            "warnings": [f"Grouping skipped due to error: {str(e)}"],
            "messages": [{
                "role": "system",
                "content": "[Grouping] Skipped due to error"
            }]
        }
