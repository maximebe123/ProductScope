"""
Feature Discovery Multi-Agent Pipeline

Discovers features from a GitHub repository using a 6-agent pipeline:
1. Code Analyzer - Analyzes repo structure and patterns
2. Feature Discoverer - Identifies potential features
3. Gap Analyst - Finds missing features (best practices)
4. Tech Debt Analyst - Identifies technical improvements
5. Feature Enricher - Adds detailed specs
6. Priority Ranker - Scores and ranks features
"""

from .state import (
    FeatureDiscoveryState,
    create_initial_discovery_state,
    FeatureCategory,
    FeatureSource,
    CodeAnalysisResult,
    DiscoveredFeature,
    GapFeature,
    TechDebtFeature,
    EnrichedFeature,
    RankedFeature,
    CandidateFeature,
    RepoAnalysis,
    RepoFile,
)
from .graph import (
    get_feature_discovery_graph,
    create_feature_discovery_graph,
    reset_feature_discovery_graph,
)

__all__ = [
    # State
    "FeatureDiscoveryState",
    "create_initial_discovery_state",
    # Enums
    "FeatureCategory",
    "FeatureSource",
    # Models
    "CodeAnalysisResult",
    "DiscoveredFeature",
    "GapFeature",
    "TechDebtFeature",
    "EnrichedFeature",
    "RankedFeature",
    "CandidateFeature",
    "RepoAnalysis",
    "RepoFile",
    # Graph
    "get_feature_discovery_graph",
    "create_feature_discovery_graph",
    "reset_feature_discovery_graph",
]
