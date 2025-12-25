"""
Feature Extraction State Definition

Defines the shared state for the feature extraction workflow
that extracts EXISTING features from a GitHub repository.
"""

from typing import TypedDict, List, Optional, Literal
from pydantic import BaseModel, Field


# =============================================================================
# AGENT OUTPUT MODELS
# =============================================================================

class ModuleInfo(BaseModel):
    """Information about a code module."""
    name: str = Field(description="Module name")
    type: str = Field(description="Module type: api, ui, service, utility")
    purpose: str = Field(description="What this module does")
    files: List[str] = Field(default_factory=list, description="Files in this module")


class ApiEndpoint(BaseModel):
    """An API endpoint in the codebase."""
    method: str = Field(description="HTTP method: GET, POST, PUT, DELETE")
    path: str = Field(description="Endpoint path")
    purpose: str = Field(description="What this endpoint does")


class UiPage(BaseModel):
    """A UI page/view in the codebase."""
    name: str = Field(description="Page name")
    route: str = Field(description="Page route")
    purpose: str = Field(description="What this page does")


class IdentifiedFeature(BaseModel):
    """A feature identified from code analysis."""
    name: str = Field(description="Feature name")
    type: str = Field(description="Feature type: api, ui, background, integration")
    description: str = Field(description="Brief description")
    location: List[str] = Field(default_factory=list, description="Files where implemented")


class TechStack(BaseModel):
    """Technology stack breakdown."""
    frontend: List[str] = Field(default_factory=list)
    backend: List[str] = Field(default_factory=list)
    database: List[str] = Field(default_factory=list)
    other: List[str] = Field(default_factory=list)


class CodeAnalysisResult(BaseModel):
    """Output from Code Analyzer Agent for extraction."""
    architecture_type: str = Field(
        description="Architecture type: monolith, microservices, serverless, hybrid"
    )
    primary_domain: str = Field(
        description="Main business domain"
    )
    tech_stack: TechStack = Field(
        description="Technology stack breakdown"
    )
    modules: List[ModuleInfo] = Field(
        default_factory=list,
        description="Identified modules"
    )
    api_endpoints: List[ApiEndpoint] = Field(
        default_factory=list,
        description="API endpoints found"
    )
    ui_pages: List[UiPage] = Field(
        default_factory=list,
        description="UI pages found"
    )
    identified_features: List[IdentifiedFeature] = Field(
        default_factory=list,
        description="Features identified from code"
    )


class ExtractedFeature(BaseModel):
    """A feature extracted from the codebase."""
    temp_id: str = Field(description="Temporary ID (feat_0, feat_1, etc.)")
    title: str = Field(description="Clear, descriptive feature title")
    description: str = Field(description="What this feature does and its value")
    completeness: Literal["full", "partial", "basic"] = Field(
        description="How complete is the implementation"
    )
    user_facing: bool = Field(
        default=True,
        description="Is this feature visible to users"
    )
    modules_involved: List[str] = Field(
        default_factory=list,
        description="Modules involved in this feature"
    )
    key_files: List[str] = Field(
        default_factory=list,
        description="Key files implementing this feature"
    )
    depends_on: List[str] = Field(
        default_factory=list,
        description="Other features this depends on"
    )
    estimated_complexity: Literal["low", "medium", "high"] = Field(
        description="Complexity of this feature"
    )


class ExtractedFeaturesResponse(BaseModel):
    """Response from feature extractor."""
    extracted_features: List[ExtractedFeature] = Field(default_factory=list)
    total_features: int = Field(default=0)
    by_category: dict = Field(default_factory=dict)


class EnrichedFeature(BaseModel):
    """Fully enriched extracted feature."""
    temp_id: str = Field(description="Temporary ID")
    title: str = Field(description="Feature title")
    problem: str = Field(description="Problem this feature solves")
    solution: str = Field(description="How it solves the problem")
    target_users: str = Field(description="Who uses this feature")
    success_metrics: str = Field(description="How to measure success")
    technical_notes: Optional[str] = Field(
        default=None,
        description="Technical implementation notes"
    )
    priority: Literal["low", "medium", "high", "critical"] = Field(
        description="Feature priority"
    )
    priority_score: int = Field(ge=1, le=100, description="Priority score 1-100")
    effort_estimate: Literal["small", "medium", "large", "xlarge"] = Field(
        description="Effort estimate"
    )
    impact_estimate: Literal["low", "medium", "high"] = Field(
        description="Impact estimate"
    )
    category: str = Field(description="Feature category")
    source: str = Field(default="extracted", description="Source of this feature")
    tags: List[str] = Field(default_factory=list, description="Tags")


class EnrichedFeaturesResponse(BaseModel):
    """Response from feature enricher."""
    features: List[EnrichedFeature] = Field(default_factory=list)


# =============================================================================
# CANDIDATE FEATURE (Final Output)
# =============================================================================

class CandidateFeature(BaseModel):
    """Complete feature candidate for user review."""
    temp_id: str
    title: str
    problem: str
    solution: str
    target_users: str
    success_metrics: str
    technical_notes: Optional[str] = None
    priority: Literal["low", "medium", "high", "critical"]
    priority_score: int = Field(ge=1, le=100)
    effort_estimate: Literal["small", "medium", "large", "xlarge"]
    impact_estimate: Literal["low", "medium", "high"]
    tags: List[str] = Field(default_factory=list)
    category: str
    source: str = "extracted"


# =============================================================================
# FEATURE EXTRACTION STATE
# =============================================================================

class FeatureExtractionState(TypedDict):
    """State for the feature extraction workflow."""

    # Input
    project_id: str
    repo_analysis: dict
    user_context: Optional[str]
    focus_areas: List[str]

    # Agent outputs
    code_analysis: Optional[dict]
    extracted_features: List[dict]
    enriched_features: List[dict]

    # Processing
    current_agent: str
    agent_history: List[str]

    # Control
    max_features: int

    # Result
    candidate_features: List[dict]
    status: Literal["pending", "in_progress", "success", "failed"]
    error_message: Optional[str]


def create_initial_extraction_state(
    project_id: str,
    repo_analysis: dict,
    user_context: Optional[str] = None,
    focus_areas: Optional[List[str]] = None,
    max_features: int = 20,
) -> FeatureExtractionState:
    """Create initial state for feature extraction workflow."""
    return FeatureExtractionState(
        project_id=project_id,
        repo_analysis=repo_analysis,
        user_context=user_context,
        focus_areas=focus_areas or [],
        code_analysis=None,
        extracted_features=[],
        enriched_features=[],
        current_agent="",
        agent_history=[],
        max_features=max_features,
        candidate_features=[],
        status="pending",
        error_message=None,
    )
