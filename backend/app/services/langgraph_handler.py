"""
LangGraph Operation Handler

Provides a simple interface for executing AI operations using the
LangGraph multi-agent architecture.

This replaces the single-shot execute_ai_operation() with a
validation-retry loop for improved output quality.
"""

import logging
from typing import Any, Dict, List, Literal, Optional

from app.core.ai.graph import get_ai_graph
from app.core.ai.graph_state import create_initial_state, GraphState

logger = logging.getLogger(__name__)


async def execute_with_langgraph(
    description: str,
    module_type: Literal["flowchart", "diagrams", "mindmap"],
    context: Optional[Dict[str, Any]] = None,
    conversation_history: Optional[List[Dict[str, str]]] = None,
    max_attempts: int = 1  # Default to 1 (no retries) for faster response
) -> Dict[str, Any]:
    """
    Execute an AI operation using the LangGraph multi-agent workflow.

    This function:
    1. Creates initial state from the request
    2. Runs the graph (planner → generator → validator → finalize)
    3. Automatically retries with reflection on validation errors
    4. Returns the final response

    Args:
        description: The user's natural language request
        module_type: Which module to use (flowchart, diagrams, mindmap)
        context: Current state of the diagram/flowchart (optional)
        conversation_history: Previous conversation messages (optional)
        max_attempts: Maximum retry attempts for validation (default: 3)

    Returns:
        Dict containing the operation response with:
        - success: bool
        - operation_type: str
        - message: str
        - ...module-specific fields (mermaid_code, nodes, etc.)
        - warnings: List[str] (if any validation issues occurred)

    Raises:
        Exception: If graph execution fails completely
    """
    logger.info(
        f"[LangGraph] Executing {module_type} operation: "
        f"{description[:50]}..."
    )

    # Create initial state
    initial_state = create_initial_state(
        user_request=description,
        module_type=module_type,
        context=context,
        conversation_history=conversation_history,
        max_attempts=max_attempts
    )

    # Get the graph
    graph = get_ai_graph()

    # Execute the graph
    try:
        result = await graph.ainvoke(initial_state)

        # Extract final response
        final_response = result.get("final_response", {})
        status = result.get("status", "unknown")
        warnings = result.get("warnings", [])

        logger.info(
            f"[LangGraph] Completed with status: {status}, "
            f"attempts: {result.get('attempt_number', 1)}, "
            f"warnings: {len(warnings)}"
        )

        # Add warnings to response if not already there
        if warnings and "warnings" not in final_response:
            final_response["warnings"] = warnings

        return final_response

    except Exception as e:
        logger.error(f"[LangGraph] Graph execution failed: {e}", exc_info=True)
        raise


async def execute_with_langgraph_stream(
    description: str,
    module_type: Literal["flowchart", "diagrams", "mindmap"],
    context: Optional[Dict[str, Any]] = None,
    conversation_history: Optional[List[Dict[str, str]]] = None,
    max_attempts: int = 3
):
    """
    Execute an AI operation with streaming updates.

    Yields progress updates as the graph executes.

    Args:
        description: The user's natural language request
        module_type: Which module to use
        context: Current state of the diagram/flowchart
        conversation_history: Previous conversation messages
        max_attempts: Maximum retry attempts

    Yields:
        Dict with type and data for each node completion:
        - {"type": "node_update", "node": "generator", "data": {...}}
        - {"type": "complete", "data": {...}}
    """
    logger.info(f"[LangGraph Stream] Starting {module_type} operation")

    # Create initial state
    initial_state = create_initial_state(
        user_request=description,
        module_type=module_type,
        context=context,
        conversation_history=conversation_history,
        max_attempts=max_attempts
    )

    # Get the graph
    graph = get_ai_graph()

    # Stream execution
    try:
        final_result = None

        async for chunk in graph.astream(initial_state, stream_mode="updates"):
            # Each chunk is {node_name: node_output}
            node_name = list(chunk.keys())[0]
            node_output = chunk[node_name]

            # Yield progress update
            yield {
                "type": "node_update",
                "node": node_name,
                "data": {
                    "is_valid": node_output.get("is_valid"),
                    "attempt_number": node_output.get("attempt_number"),
                    "has_errors": len(node_output.get("validation_errors", [])) > 0,
                }
            }

            # Track final result
            if node_name in ("finalize", "finalize_warning"):
                final_result = node_output

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
        logger.error(f"[LangGraph Stream] Error: {e}", exc_info=True)
        yield {
            "type": "error",
            "data": {"message": str(e)}
        }


def is_langgraph_enabled() -> bool:
    """
    Check if LangGraph is available and enabled.

    Returns True if langgraph package is installed.
    """
    try:
        import langgraph
        return True
    except ImportError:
        return False
