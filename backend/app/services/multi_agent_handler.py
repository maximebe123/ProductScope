"""
Multi-Agent Operation Handler

Provides a simple interface for executing AI operations using the
multi-agent architecture with specialized agents and multiple models.

Key differences from single-agent:
- Uses specialized agents with different models (GPT-5, GPT-5-mini, GPT-4o)
- Quality review loop with routing back to specific agents
- max_attempts=3 by default
"""

import logging
from typing import Any, Dict, List, Literal, Optional, AsyncGenerator

from app.config import settings
from app.core.ai.multi_agent_graph import get_multi_agent_graph
from app.core.ai.agent_state import create_initial_multi_agent_state, MultiAgentState

logger = logging.getLogger(__name__)


async def execute_with_multi_agent(
    description: str,
    module_type: Literal["flowchart", "diagrams", "mindmap"],
    context: Optional[Dict[str, Any]] = None,
    conversation_history: Optional[List[Dict[str, str]]] = None,
    max_attempts: int = 3,
    max_review_iterations: int = 2
) -> Dict[str, Any]:
    """
    Execute an AI operation using the multi-agent workflow.

    This function:
    1. Creates initial state from the request
    2. Runs the graph (architect → component → connection/grouping → layout → reviewer → finalizer)
    3. Automatically routes back to specific agents on quality issues
    4. Returns the final response

    Args:
        description: The user's natural language request
        module_type: Which module to use (flowchart, diagrams, mindmap)
        context: Current state of the diagram (optional)
        conversation_history: Previous conversation messages (optional)
        max_attempts: Maximum retry attempts for the entire workflow
        max_review_iterations: Maximum review loop iterations

    Returns:
        Dict containing the operation response with:
        - success: bool
        - operation_type: str
        - message: str
        - diagram: {...} with nodes and edges
        - warnings: List[str] (if any issues occurred)

    Raises:
        Exception: If graph execution fails completely
    """
    logger.info(
        f"[MultiAgent] Executing {module_type} operation: "
        f"{description[:50]}..."
    )

    # Use settings defaults if not specified
    if max_attempts is None:
        max_attempts = settings.DEFAULT_MAX_ATTEMPTS
    if max_review_iterations is None:
        max_review_iterations = settings.MAX_REVIEW_ITERATIONS

    # Create initial state
    initial_state = create_initial_multi_agent_state(
        user_request=description,
        module_type=module_type,
        context=context,
        conversation_history=conversation_history,
        max_attempts=max_attempts,
        max_review_iterations=max_review_iterations
    )

    # Get the graph
    graph = get_multi_agent_graph()

    # Execute the graph
    try:
        result = await graph.ainvoke(initial_state)

        # Extract final response
        final_response = result.get("final_response", {})
        status = result.get("status", "unknown")
        warnings = result.get("warnings", [])
        agent_history = result.get("agent_history", [])
        review_iterations = result.get("review_iterations", 0)

        logger.info(
            f"[MultiAgent] Completed with status: {status}, "
            f"agents: {' → '.join(agent_history)}, "
            f"review iterations: {review_iterations}"
        )

        # Add metadata to response
        if warnings and "warnings" not in final_response:
            final_response["warnings"] = warnings

        # Add agent trace for debugging
        final_response["_agent_trace"] = agent_history
        final_response["_review_iterations"] = review_iterations

        return final_response

    except Exception as e:
        logger.error(f"[MultiAgent] Graph execution failed: {e}", exc_info=True)
        raise


async def execute_with_multi_agent_stream(
    description: str,
    module_type: Literal["flowchart", "diagrams", "mindmap"],
    context: Optional[Dict[str, Any]] = None,
    conversation_history: Optional[List[Dict[str, str]]] = None,
    max_attempts: int = 3,
    max_review_iterations: int = 2
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Execute a multi-agent operation with streaming updates.

    Yields progress updates as each agent completes.

    Args:
        description: The user's natural language request
        module_type: Which module to use
        context: Current state of the diagram
        conversation_history: Previous conversation messages
        max_attempts: Maximum retry attempts
        max_review_iterations: Maximum review iterations

    Yields:
        Dict with type and data for each agent completion:
        - {"type": "agent_update", "agent": "architect", "data": {...}}
        - {"type": "review", "score": 8, "decision": "approve"}
        - {"type": "complete", "data": {...}}
    """
    logger.info(f"[MultiAgent Stream] Starting {module_type} operation")

    # Create initial state
    initial_state = create_initial_multi_agent_state(
        user_request=description,
        module_type=module_type,
        context=context,
        conversation_history=conversation_history,
        max_attempts=max_attempts,
        max_review_iterations=max_review_iterations
    )

    # Get the graph
    graph = get_multi_agent_graph()

    # Stream execution
    try:
        final_result = None

        async for chunk in graph.astream(initial_state, stream_mode="updates"):
            # Each chunk is {node_name: node_output}
            node_name = list(chunk.keys())[0]
            node_output = chunk[node_name]

            # Yield agent update
            if node_name == "reviewer":
                review = node_output.get("quality_review")
                if review:
                    yield {
                        "type": "review",
                        "agent": node_name,
                        "score": review.overall_score,
                        "decision": review.decision,
                        "issues": review.issues[:3] if review.issues else []
                    }
                else:
                    yield {
                        "type": "agent_update",
                        "agent": node_name,
                        "status": "completed"
                    }
            elif node_name == "finalizer":
                yield {
                    "type": "agent_update",
                    "agent": node_name,
                    "status": "completed",
                    "node_count": len(node_output.get("final_diagram", {}).get("nodes", []))
                }
                final_result = node_output
            else:
                # Progress update for other agents
                yield {
                    "type": "agent_update",
                    "agent": node_name,
                    "status": "completed"
                }

        # Yield final result
        if final_result:
            yield {
                "type": "complete",
                "data": final_result.get("final_response", {})
            }
        else:
            yield {
                "type": "error",
                "data": {"message": "No final result from graph"}
            }

    except Exception as e:
        logger.error(f"[MultiAgent Stream] Error: {e}", exc_info=True)
        yield {
            "type": "error",
            "data": {"message": str(e)}
        }


def is_multi_agent_enabled() -> bool:
    """
    Check if multi-agent mode is enabled.

    Returns True if USE_MULTI_AGENT setting is True.
    """
    return settings.USE_MULTI_AGENT


def get_multi_agent_info() -> Dict[str, Any]:
    """
    Get information about the multi-agent configuration.

    Returns:
        Dict with model assignments and settings
    """
    return {
        "enabled": settings.USE_MULTI_AGENT,
        "models": {
            "architect": settings.MODEL_ARCHITECT,
            "component": settings.MODEL_COMPONENT,
            "connection": settings.MODEL_CONNECTION,
            "grouping": settings.MODEL_GROUPING,
            "layout": settings.MODEL_LAYOUT,
            "reviewer": settings.MODEL_REVIEWER,
            "finalizer": settings.MODEL_FINALIZER,
        },
        "settings": {
            "default_max_attempts": settings.DEFAULT_MAX_ATTEMPTS,
            "max_review_iterations": settings.MAX_REVIEW_ITERATIONS,
        }
    }
