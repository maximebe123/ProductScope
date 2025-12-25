"""
Multi-Agent LangGraph Assembly

Creates the StateGraph that orchestrates the multi-agent workflow:
Architect → Component → [Connection ∥ Grouping] → Layout → Reviewer → Finalizer

With quality review loop that can route back to specific agents.
"""

import logging
from typing import Literal, Optional

from langgraph.graph import StateGraph, START, END

from .agent_state import MultiAgentState
from .agents import (
    architect_agent,
    component_agent,
    connection_agent,
    grouping_agent,
    layout_agent,
    reviewer_agent,
    finalizer_agent,
)

logger = logging.getLogger(__name__)

# Singleton graph instance
_multi_agent_graph: Optional[StateGraph] = None


def route_after_review(state: MultiAgentState) -> Literal[
    "finalizer",
    "architect",
    "component",
    "connection",
    "grouping",
    "layout"
]:
    """
    Route based on quality review decision.

    The reviewer scores the output and decides:
    - approve (score >= 8): Go to finalizer
    - fix_*: Route back to specific agent
    - restart: Go back to architect
    """
    review = state.get("quality_review")

    if not review:
        logger.warning("[Router] No review found, going to finalizer")
        return "finalizer"

    decision = review.decision
    score = review.overall_score

    # Safety check: force approve if max iterations reached
    review_iterations = state.get("review_iterations", 0)
    max_iterations = state.get("max_review_iterations", 2)

    if review_iterations >= max_iterations and decision != "approve":
        logger.warning(f"[Router] Max iterations ({review_iterations}/{max_iterations}) reached, forcing finalizer")
        return "finalizer"

    logger.info(f"[Router] Review decision: {decision} (score: {score}/10, iteration: {review_iterations})")

    if decision == "approve":
        return "finalizer"
    elif decision == "fix_components":
        return "component"
    elif decision == "fix_connections":
        return "connection"
    elif decision == "fix_groups":
        return "grouping"
    elif decision == "fix_layout":
        return "layout"
    elif decision == "restart":
        return "architect"
    else:
        # Unknown decision, go to finalizer
        logger.warning(f"[Router] Unknown decision '{decision}', going to finalizer")
        return "finalizer"


def should_skip_review(state: MultiAgentState) -> Literal["reviewer", "finalizer"]:
    """
    Check if we should skip review (e.g., after max iterations).
    """
    review_iterations = state.get("review_iterations", 0)
    max_iterations = state.get("max_review_iterations", 2)

    if review_iterations >= max_iterations:
        logger.warning(f"[Router] Max review iterations ({max_iterations}) reached")
        return "finalizer"

    return "reviewer"


def merge_parallel_results(state: MultiAgentState) -> MultiAgentState:
    """
    Merge results from parallel connection and grouping agents.

    This is called after both agents complete to combine their outputs.
    """
    # Both agents update the state independently
    # LangGraph handles the merge automatically
    logger.info("[Merge] Parallel agents complete")
    return state


def create_multi_agent_graph() -> StateGraph:
    """
    Create the multi-agent LangGraph StateGraph.

    Graph structure:
    ```
                        START
                          │
                          ▼
                    ┌──────────┐
                    │ Architect│ (GPT-5)
                    └────┬─────┘
                         │
                         ▼
                    ┌──────────┐
                    │Component │ (GPT-5)
                    └────┬─────┘
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
        ┌──────────┐         ┌──────────┐
        │Connection│         │ Grouping │ (parallel)
        │(GPT-5-mini)        │(GPT-5-mini)
        └────┬─────┘         └────┬─────┘
              │                    │
              └──────────┬─────────┘
                         ▼
                    ┌──────────┐
                    │  Layout  │ (GPT-4o)
                    └────┬─────┘
                         │
                         ▼
                    ┌──────────┐
                    │ Reviewer │ (GPT-5)
                    └────┬─────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
      approve       fix_specific      restart
         │               │               │
         ▼               │               │
    ┌──────────┐         │               │
    │ Finalizer│◄────────┘               │
    │ (GPT-4o) │                         │
    └────┬─────┘                         │
         │                               │
         ▼                               │
        END ◄────────────────────────────┘
    ```

    Returns:
        Compiled StateGraph ready for execution
    """
    logger.info("[Graph] Creating multi-agent graph")

    builder = StateGraph(MultiAgentState)

    # Add all agent nodes
    builder.add_node("architect", architect_agent)
    builder.add_node("component", component_agent)
    builder.add_node("connection", connection_agent)
    builder.add_node("grouping", grouping_agent)
    builder.add_node("layout", layout_agent)
    builder.add_node("reviewer", reviewer_agent)
    builder.add_node("finalizer", finalizer_agent)

    # === Linear Flow: START → architect → component ===
    builder.add_edge(START, "architect")
    builder.add_edge("architect", "component")

    # === Parallel: component → connection AND grouping ===
    # Note: In LangGraph, we express parallel execution by having
    # multiple edges from the same source
    builder.add_edge("component", "connection")
    builder.add_edge("component", "grouping")

    # === Converge: connection AND grouping → layout ===
    # LangGraph waits for both to complete before proceeding
    builder.add_edge("connection", "layout")
    builder.add_edge("grouping", "layout")

    # === Layout → Reviewer ===
    builder.add_edge("layout", "reviewer")

    # === Reviewer routes conditionally ===
    builder.add_conditional_edges(
        "reviewer",
        route_after_review,
        {
            "finalizer": "finalizer",
            "architect": "architect",
            "component": "component",
            "connection": "connection",
            "grouping": "grouping",
            "layout": "layout",
        }
    )

    # === Finalizer → END ===
    builder.add_edge("finalizer", END)

    # Compile the graph
    graph = builder.compile()

    logger.info("[Graph] Multi-agent graph compiled successfully")

    return graph


def get_multi_agent_graph() -> StateGraph:
    """
    Get or create the singleton multi-agent graph.

    Returns:
        Compiled StateGraph instance
    """
    global _multi_agent_graph
    if _multi_agent_graph is None:
        _multi_agent_graph = create_multi_agent_graph()
    return _multi_agent_graph


def reset_multi_agent_graph():
    """Reset the singleton graph (for testing)."""
    global _multi_agent_graph
    _multi_agent_graph = None
