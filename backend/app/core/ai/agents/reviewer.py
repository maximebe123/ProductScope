"""
Quality Reviewer Agent

Reviews the complete output and decides on routing.
Uses GPT-5 for deep quality analysis.
"""

import logging
from typing import Any, Dict

from app.config import settings
from app.core.ai.agent_state import MultiAgentState, QualityReview
from app.core.ai.client import get_openai_client
from app.core.ai.prompts.reviewer_prompt import get_reviewer_prompt

logger = logging.getLogger(__name__)


async def reviewer_agent(state: MultiAgentState) -> Dict[str, Any]:
    """
    Quality Reviewer: Reviews output and routes for fixes.

    Uses GPT-5 for deep quality analysis.
    Routes back to specific agents if issues are found.

    Args:
        state: Current multi-agent state

    Returns:
        Dict with quality_review and updated state fields
    """
    logger.info("[Reviewer] Starting quality review")

    architecture_plan = state.get("architecture_plan")
    components = state.get("components", [])
    connections = state.get("connections", [])
    groups = state.get("groups", [])
    layout_positions = state.get("layout_positions", [])
    review_iterations = state.get("review_iterations", 0)
    max_review_iterations = state.get("max_review_iterations", 2)

    # Check if we've hit max iterations
    if review_iterations >= max_review_iterations:
        logger.warning(f"[Reviewer] Max iterations ({max_review_iterations}) reached, forcing approval")
        return {
            "quality_review": QualityReview(
                overall_score=7,
                decision="approve",
                issues=["Max review iterations reached"],
                suggestions=["Consider manual review"],
                target_agent=None
            ),
            "current_agent": "reviewer",
            "review_iterations": review_iterations + 1,
            "messages": [{
                "role": "system",
                "content": "[Reviewer] Max iterations reached, approving"
            }]
        }

    # Quick validation before LLM call
    quick_issues = []

    # Check for orphan nodes (non-actor nodes with no connections)
    connected_nodes = set()
    for conn in connections:
        connected_nodes.add(conn.source)
        connected_nodes.add(conn.target)

    orphans = [
        c.id for c in components
        if c.id not in connected_nodes and c.nodeType != "actor"
    ]
    if orphans:
        quick_issues.append(f"Orphan nodes: {orphans}")

    # Check for generic tags
    generic_tags = {"Database", "Cache", "API", "Service", "Backend", "Frontend", "Server"}
    for comp in components:
        if any(tag in generic_tags for tag in comp.tags):
            quick_issues.append(f"Generic tags in {comp.id}: {comp.tags}")
            break

    # Check for unlabeled edges
    unlabeled = [c.id for c in connections if not c.label]
    if unlabeled:
        quick_issues.append(f"Unlabeled edges: {unlabeled}")

    # Get the specialized prompt
    prompt = get_reviewer_prompt(
        architecture_plan=architecture_plan,
        components=components,
        connections=connections,
        groups=groups,
        layout_positions=layout_positions,
        review_iteration=review_iterations
    )

    # Build user message with quick issues
    user_message = "Review this diagram output and provide your assessment.\n"
    if quick_issues:
        user_message += f"\nQuick validation found: {quick_issues}\n"
    user_message += "\nReturn your quality review."

    # Call GPT-5 for deep analysis
    client = get_openai_client()

    try:
        # Note: GPT-5 reasoning models don't support temperature parameter
        response = await client.beta.chat.completions.parse(
            model=settings.MODEL_REVIEWER,
            reasoning_effort="medium",  # Thorough quality review
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": user_message}
            ],
            response_format=QualityReview,
        )

        review = response.choices[0].message.parsed

        logger.info(
            f"[Reviewer] Score: {review.overall_score}/10, "
            f"Decision: {review.decision}, "
            f"Issues: {len(review.issues)}"
        )

        if review.issues:
            for issue in review.issues[:3]:  # Log first 3 issues
                logger.info(f"[Reviewer] Issue: {issue}")

        # Update agent history
        agent_history = state.get("agent_history", []).copy()
        agent_history.append("reviewer")

        return {
            "quality_review": review,
            "current_agent": "reviewer",
            "agent_history": agent_history,
            "review_iterations": review_iterations + 1,
            "messages": [{
                "role": "system",
                "content": f"[Reviewer] Score {review.overall_score}/10, decision: {review.decision}"
            }]
        }

    except Exception as e:
        logger.error(f"[Reviewer] Error: {e}", exc_info=True)

        # Fallback: approve with warning if we have basic data
        has_components = len(components) > 0
        has_connections = len(connections) > 0
        has_positions = len(layout_positions) > 0

        if has_components and has_connections and has_positions:
            return {
                "quality_review": QualityReview(
                    overall_score=7,
                    decision="approve",
                    issues=[f"Review error: {str(e)}"],
                    suggestions=["Manual review recommended"],
                    target_agent=None
                ),
                "current_agent": "reviewer",
                "review_iterations": review_iterations + 1,
                "warnings": [f"Reviewer fallback: {str(e)}"],
                "messages": [{
                    "role": "system",
                    "content": "[Reviewer] Error, approving with warning"
                }]
            }
        else:
            return {
                "quality_review": QualityReview(
                    overall_score=3,
                    decision="restart",
                    issues=[f"Review error: {str(e)}", "Missing essential data"],
                    suggestions=["Restart the process"],
                    target_agent="architect"
                ),
                "current_agent": "reviewer",
                "review_iterations": review_iterations + 1,
                "messages": [{
                    "role": "system",
                    "content": "[Reviewer] Error, requesting restart"
                }]
            }
