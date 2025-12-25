"""
Component Specialist Agent

Selects specific node types with technology tags and volumes.
Uses GPT-5 for accurate component selection.
"""

import logging
from typing import Any, Dict, List

from pydantic import BaseModel

from app.config import settings
from app.core.ai.agent_state import MultiAgentState, ComponentSpec
from app.core.ai.client import get_openai_client
from app.core.ai.prompts.component_prompt import get_component_prompt

logger = logging.getLogger(__name__)


class ComponentListResponse(BaseModel):
    """Wrapper for component list response"""
    components: List[ComponentSpec]


async def component_agent(state: MultiAgentState) -> Dict[str, Any]:
    """
    Component Specialist: Selects node types, tags, and volumes.

    Uses GPT-5 for accurate component selection from 39 available types.

    Args:
        state: Current multi-agent state

    Returns:
        Dict with components list and updated state fields
    """
    logger.info("[Component] Starting component selection")

    architecture_plan = state.get("architecture_plan")
    if not architecture_plan:
        logger.error("[Component] No architecture plan available")
        return {
            "components": [],
            "current_agent": "component",
            "status": "failed",
            "warnings": ["No architecture plan provided"]
        }

    # Get the specialized prompt
    prompt = get_component_prompt(architecture_plan)

    # Build user message with the original request for context
    user_message = f"""Based on the architecture plan above, select the specific components.

Original user request: {state['user_request']}

Return a JSON object with a 'components' array."""

    # Call GPT-5 for deep reasoning
    client = get_openai_client()

    try:
        # Note: GPT-5 reasoning models don't support temperature parameter
        response = await client.beta.chat.completions.parse(
            model=settings.MODEL_COMPONENT,
            reasoning_effort="low",  # Fast selection from known types
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": user_message}
            ],
            response_format=ComponentListResponse,
        )

        result = response.choices[0].message.parsed
        components = result.components

        logger.info(f"[Component] Selected {len(components)} components")

        # Log component breakdown
        by_type = {}
        for c in components:
            by_type[c.nodeType] = by_type.get(c.nodeType, 0) + 1
        logger.info(f"[Component] Types: {by_type}")

        # Update agent history
        agent_history = state.get("agent_history", []).copy()
        agent_history.append("component")

        return {
            "components": components,
            "current_agent": "component",
            "agent_history": agent_history,
            "messages": [{
                "role": "system",
                "content": f"[Component] Selected {len(components)} components"
            }]
        }

    except Exception as e:
        logger.error(f"[Component] Error: {e}", exc_info=True)

        # Fallback: create minimal components based on plan
        fallback_components = []
        estimated = architecture_plan.estimated_nodes

        # Create basic components
        if "applications" in architecture_plan.component_categories:
            fallback_components.append(ComponentSpec(
                id="node_0",
                nodeType="webapp",
                label="Frontend App",
                tags=["React", "TypeScript"],
                description="Main frontend application",
                suggested_layer=1
            ))

        if "data" in architecture_plan.component_categories:
            fallback_components.append(ComponentSpec(
                id=f"node_{len(fallback_components)}",
                nodeType="sql",
                label="Database",
                tags=["PostgreSQL", "15"],
                volumes=[{"name": "pg-data", "mountPath": "/var/lib/postgresql/data"}],
                description="Primary database",
                suggested_layer=4
            ))

        return {
            "components": fallback_components,
            "current_agent": "component",
            "agent_history": state.get("agent_history", []) + ["component"],
            "warnings": [f"Component fallback used: {str(e)}"],
            "messages": [{
                "role": "system",
                "content": "[Component] Using fallback components"
            }]
        }
