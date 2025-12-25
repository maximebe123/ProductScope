"""
Architect Agent

Analyzes the user request and creates a high-level architecture plan.
Uses GPT-5 for deep reasoning about architecture patterns.
"""

import logging
from typing import Any, Dict

from app.config import settings
from app.core.ai.agent_state import MultiAgentState, ArchitecturePlan
from app.core.ai.client import get_openai_client
from app.core.ai.prompts.architect_prompt import get_architect_prompt
from app.models.operations import DiagramContext

logger = logging.getLogger(__name__)


async def architect_agent(state: MultiAgentState) -> Dict[str, Any]:
    """
    Architect Agent: Analyzes request and creates architecture plan.

    Uses GPT-5 for deep reasoning about architecture patterns.

    Args:
        state: Current multi-agent state

    Returns:
        Dict with architecture_plan and updated state fields
    """
    logger.info("[Architect] Starting architecture analysis")

    user_request = state["user_request"]
    context = state.get("context")
    conversation_history = state.get("conversation_history", [])

    # Build context if available
    diagram_context = None
    if context:
        try:
            diagram_context = DiagramContext(**context)
        except Exception:
            pass

    # Get the specialized prompt
    prompt = get_architect_prompt(
        context=diagram_context,
        conversation_history=conversation_history
    )

    # Call GPT-5 for deep reasoning
    client = get_openai_client()

    try:
        # Note: GPT-5 reasoning models don't support temperature parameter
        response = await client.beta.chat.completions.parse(
            model=settings.MODEL_ARCHITECT,
            reasoning_effort="medium",  # Balance speed vs quality for planning
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": user_request}
            ],
            response_format=ArchitecturePlan,
        )

        plan = response.choices[0].message.parsed

        logger.info(
            f"[Architect] Plan created: {plan.complexity_score}/10 complexity, "
            f"~{plan.estimated_nodes} nodes, patterns: {plan.suggested_patterns}"
        )

        return {
            "architecture_plan": plan,
            "current_agent": "architect",
            "agent_history": ["architect"],
            "status": "in_progress",
            "messages": [{
                "role": "system",
                "content": f"[Architect] Created plan with {plan.estimated_nodes} expected nodes"
            }]
        }

    except Exception as e:
        logger.error(f"[Architect] Error: {e}", exc_info=True)

        # Fallback: create a minimal plan
        fallback_plan = ArchitecturePlan(
            analysis=f"Processing request: {user_request[:100]}...",
            component_categories=["applications", "data"],
            suggested_patterns=["simple"],
            complexity_score=5,
            estimated_nodes=5,
            estimated_edges=4,
            special_requirements=[]
        )

        return {
            "architecture_plan": fallback_plan,
            "current_agent": "architect",
            "agent_history": ["architect"],
            "status": "in_progress",
            "warnings": [f"Architect fallback used: {str(e)}"],
            "messages": [{
                "role": "system",
                "content": "[Architect] Using fallback plan"
            }]
        }
