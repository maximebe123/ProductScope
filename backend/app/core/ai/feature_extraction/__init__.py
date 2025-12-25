"""
Feature Extraction Module

Contains state definitions and utilities for extracting
existing features from a GitHub repository.
"""

from .state import (
    CodeAnalysisResult,
    ExtractedFeature,
    ExtractedFeaturesResponse,
    EnrichedFeature,
    EnrichedFeaturesResponse,
    CandidateFeature,
    FeatureExtractionState,
    create_initial_extraction_state,
)

__all__ = [
    "CodeAnalysisResult",
    "ExtractedFeature",
    "ExtractedFeaturesResponse",
    "EnrichedFeature",
    "EnrichedFeaturesResponse",
    "CandidateFeature",
    "FeatureExtractionState",
    "create_initial_extraction_state",
]
