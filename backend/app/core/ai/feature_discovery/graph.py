"""
Feature Discovery LangGraph Assembly

Creates the StateGraph that orchestrates the multi-agent workflow:
CodeAnalyzer → FeatureDiscoverer → [GapAnalyst ∥ TechDebtAnalyst] → FeatureEnricher → PriorityRanker

No review loop - features go directly to user for review.
"""

import logging
from typing import Optional

from langgraph.graph import StateGraph, START, END

from .state import FeatureDiscoveryState
from .agents import (
    code_analyzer_agent,
    feature_discoverer_agent,
    gap_analyst_agent,
    tech_debt_analyst_agent,
    feature_enricher_agent,
    priority_ranker_agent,
)

logger = logging.getLogger(__name__)

# Singleton graph instance
_feature_discovery_graph: Optional[StateGraph] = None


def create_feature_discovery_graph() -> StateGraph:
    """
    Create the feature discovery LangGraph StateGraph.

    Graph structure:
    ```
                    START
                      │
                      ▼
                ┌──────────────┐
                │ Code Analyzer│ (GPT-5.2)
                └──────┬───────┘
                       │
                       ▼
                ┌──────────────┐
                │   Feature    │ (GPT-5.2)
                │  Discoverer  │
                └──────┬───────┘
                       │
            ┌──────────┴──────────┐
            ▼                     ▼
      ┌──────────┐         ┌──────────┐
      │   Gap    │         │  Tech    │ (parallel)
      │ Analyst  │         │  Debt    │
      │(GPT-5.2) │         │(GPT-5.2) │
      └────┬─────┘         └────┬─────┘
            │                    │
            └──────────┬─────────┘
                       ▼
                ┌──────────────┐
                │   Feature    │ (GPT-5.2)
                │   Enricher   │
                └──────┬───────┘
                       │
                       ▼
                ┌──────────────┐
                │   Priority   │ (GPT-4o)
                │    Ranker    │
                └──────┬───────┘
                       │
                       ▼
                      END
    ```

    Returns:
        Compiled StateGraph ready for execution
    """
    logger.info("[Graph] Creating feature discovery graph")

    builder = StateGraph(FeatureDiscoveryState)

    # Add all agent nodes
    builder.add_node("code_analyzer", code_analyzer_agent)
    builder.add_node("feature_discoverer", feature_discoverer_agent)
    builder.add_node("gap_analyst", gap_analyst_agent)
    builder.add_node("tech_debt_analyst", tech_debt_analyst_agent)
    builder.add_node("feature_enricher", feature_enricher_agent)
    builder.add_node("priority_ranker", priority_ranker_agent)

    # === Linear Flow: START → code_analyzer → feature_discoverer ===
    builder.add_edge(START, "code_analyzer")
    builder.add_edge("code_analyzer", "feature_discoverer")

    # === Parallel: feature_discoverer → gap_analyst AND tech_debt_analyst ===
    builder.add_edge("feature_discoverer", "gap_analyst")
    builder.add_edge("feature_discoverer", "tech_debt_analyst")

    # === Converge: gap_analyst AND tech_debt_analyst → feature_enricher ===
    builder.add_edge("gap_analyst", "feature_enricher")
    builder.add_edge("tech_debt_analyst", "feature_enricher")

    # === feature_enricher → priority_ranker → END ===
    builder.add_edge("feature_enricher", "priority_ranker")
    builder.add_edge("priority_ranker", END)

    # Compile the graph
    graph = builder.compile()

    logger.info("[Graph] Feature discovery graph compiled successfully")

    return graph


def get_feature_discovery_graph() -> StateGraph:
    """
    Get or create the singleton feature discovery graph.

    Returns:
        Compiled StateGraph instance
    """
    global _feature_discovery_graph
    if _feature_discovery_graph is None:
        _feature_discovery_graph = create_feature_discovery_graph()
    return _feature_discovery_graph


def reset_feature_discovery_graph():
    """Reset the singleton graph (for testing)."""
    global _feature_discovery_graph
    _feature_discovery_graph = None
