"""
LangGraph Multi-Agent Graph Assembly

Creates the StateGraph that orchestrates the multi-agent workflow:
Planner → Generator → Validator → (Reflection → Generator) → Finalize
"""

import logging
from typing import Literal, Optional

from langgraph.graph import StateGraph, START, END

from .graph_state import GraphState
from .nodes import (
    planner_node,
    generator_node,
    validator_node,
    reflection_node,
    finalize_node,
)
from .nodes.finalize import finalize_with_warning_node

logger = logging.getLogger(__name__)

# Singleton graph instance
_graph: Optional[StateGraph] = None


def route_after_generate(state: GraphState) -> Literal["validator", "finalize"]:
    """
    Route after Generator node.

    If a tool was called, go to Validator.
    If just text response, skip to Finalize.
    """
    if state.get("tool_name"):
        return "validator"
    return "finalize"


def route_after_validate(state: GraphState) -> Literal["finalize", "finalize_warning", "reflection"]:
    """
    Route after Validator node.

    If valid, go to Finalize.
    If invalid and max attempts reached, go to Finalize with warning.
    If invalid and can retry, go to Reflection.
    """
    is_valid = state.get("is_valid", False)
    attempt = state.get("attempt_number", 1)
    max_attempts = state.get("max_attempts", 3)

    if is_valid:
        logger.info("[Router] Valid output, going to finalize")
        return "finalize"

    if attempt >= max_attempts:
        logger.warning(f"[Router] Max attempts ({max_attempts}) reached, finalizing with warning")
        return "finalize_warning"

    logger.info(f"[Router] Invalid output, attempt {attempt}/{max_attempts}, going to reflection")
    return "reflection"


def create_ai_graph() -> StateGraph:
    """
    Create the LangGraph StateGraph for AI operations.

    Graph structure:
    ```
    START
      │
      ▼
    planner ──────────────────────┐
      │                           │
      ▼                           │
    generator ◄───────────────┐   │
      │                       │   │
      ▼                       │   │
    validator                 │   │
      │                       │   │
      ├─ valid ──────► finalize ──┼──► END
      │                       │   │
      ├─ max_retries ► finalize_warning ──► END
      │                       │
      └─ retry ──► reflection ┘
    ```

    Returns:
        Compiled StateGraph ready for execution
    """
    logger.info("[Graph] Creating AI multi-agent graph")

    builder = StateGraph(GraphState)

    # Add all nodes
    builder.add_node("planner", planner_node)
    builder.add_node("generator", generator_node)
    builder.add_node("validator", validator_node)
    builder.add_node("reflection", reflection_node)
    builder.add_node("finalize", finalize_node)
    builder.add_node("finalize_warning", finalize_with_warning_node)

    # Add edges
    # START → planner
    builder.add_edge(START, "planner")

    # planner → generator
    builder.add_edge("planner", "generator")

    # generator → (validator or finalize)
    builder.add_conditional_edges(
        "generator",
        route_after_generate,
        {
            "validator": "validator",
            "finalize": "finalize"
        }
    )

    # validator → (finalize, finalize_warning, or reflection)
    builder.add_conditional_edges(
        "validator",
        route_after_validate,
        {
            "finalize": "finalize",
            "finalize_warning": "finalize_warning",
            "reflection": "reflection"
        }
    )

    # reflection → generator (retry loop)
    builder.add_edge("reflection", "generator")

    # finalize → END
    builder.add_edge("finalize", END)

    # finalize_warning → END
    builder.add_edge("finalize_warning", END)

    # Compile the graph
    graph = builder.compile()

    logger.info("[Graph] AI graph compiled successfully")

    return graph


def get_ai_graph() -> StateGraph:
    """
    Get or create the singleton AI graph.

    Returns:
        Compiled StateGraph instance
    """
    global _graph
    if _graph is None:
        _graph = create_ai_graph()
    return _graph


def reset_graph():
    """Reset the singleton graph (for testing)."""
    global _graph
    _graph = None
