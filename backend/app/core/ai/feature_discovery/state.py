"""
Feature Discovery State Definition

Defines the shared state that flows through all specialized agents
in the multi-agent feature discovery workflow.
"""

from typing import TypedDict, Annotated, List, Optional, Literal
from pydantic import BaseModel, Field
from enum import Enum
import operator


# =============================================================================
# ENUMS
# =============================================================================

class FeatureCategory(str, Enum):
    """Categories for discovered features"""
    USER_FACING = "user_facing"
    INTEGRATION = "integration"
    PERFORMANCE = "performance"
    SECURITY = "security"
    DEVELOPER_EX = "developer_experience"
    INFRASTRUCTURE = "infrastructure"
    DOCUMENTATION = "documentation"
    TESTING = "testing"


class FeatureSource(str, Enum):
    """Where the feature idea came from"""
    CODE_PATTERN = "code_pattern"
    README = "readme"
    TODO_COMMENT = "todo_comment"
    GAP_ANALYSIS = "gap_analysis"
    TECH_DEBT = "tech_debt"
    ARCHITECTURE = "architecture"


# =============================================================================
# AGENT OUTPUT MODELS
# =============================================================================

class CodeAnalysisResult(BaseModel):
    """Output from Code Analyzer Agent"""
    architecture_type: str = Field(
        description="Architecture type: monolith, microservices, serverless, hybrid, etc."
    )
    primary_domain: str = Field(
        description="Main business domain (e.g., 'e-commerce', 'CRM', 'diagramming tool')"
    )
    key_components: List[str] = Field(
        description="Main modules/components identified in the codebase"
    )
    existing_features: List[str] = Field(
        description="Features that already exist in the codebase"
    )
    tech_stack_summary: str = Field(
        description="Brief summary of technologies used"
    )
    code_patterns: List[str] = Field(
        description="Patterns detected: REST API, GraphQL, real-time, caching, etc."
    )
    pain_points: List[str] = Field(
        description="Potential issues or areas for improvement noticed"
    )
    readme_insights: Optional[str] = Field(
        default=None,
        description="Key insights extracted from README if available"
    )
    todo_comments: List[str] = Field(
        default_factory=list,
        description="TODO/FIXME comments found in code"
    )


class DiscoveredFeature(BaseModel):
    """Raw feature discovered from code analysis"""
    temp_id: str = Field(
        description="Temporary ID for tracking (disc_0, disc_1, etc.)"
    )
    title: str = Field(
        description="Short feature title (max 80 chars)"
    )
    category: FeatureCategory = Field(
        description="Feature category"
    )
    source: FeatureSource = Field(
        description="Where this feature idea came from"
    )
    evidence: str = Field(
        description="What in the code suggests this feature"
    )
    confidence: float = Field(
        ge=0, le=1,
        description="Confidence score 0-1"
    )


class GapFeature(BaseModel):
    """Feature identified from gap analysis"""
    temp_id: str = Field(
        description="Temporary ID (gap_0, gap_1, etc.)"
    )
    title: str = Field(
        description="Short feature title"
    )
    category: FeatureCategory = Field(
        description="Feature category"
    )
    comparison_basis: str = Field(
        description="What best practice or similar project this is based on"
    )
    rationale: str = Field(
        description="Why this feature would benefit the project"
    )


class TechDebtFeature(BaseModel):
    """Technical debt item as a feature"""
    temp_id: str = Field(
        description="Temporary ID (debt_0, debt_1, etc.)"
    )
    title: str = Field(
        description="Short feature title"
    )
    category: FeatureCategory = Field(
        description="Feature category"
    )
    debt_type: Literal["refactoring", "testing", "performance", "security", "documentation"] = Field(
        description="Type of technical debt"
    )
    affected_areas: List[str] = Field(
        description="Files or modules affected"
    )
    rationale: str = Field(
        description="Why this improvement is needed"
    )


class EnrichedFeature(BaseModel):
    """Fully enriched feature specification"""
    temp_id: str = Field(
        description="Temporary ID from original discovery"
    )
    title: str = Field(
        description="Feature title"
    )
    problem: str = Field(
        description="2-3 sentences describing the problem this feature solves"
    )
    solution: str = Field(
        description="2-3 sentences describing the proposed solution"
    )
    target_users: str = Field(
        description="Who benefits from this feature"
    )
    success_metrics: str = Field(
        description="Measurable success criteria"
    )
    technical_notes: Optional[str] = Field(
        default=None,
        description="Technical implementation notes"
    )
    category: FeatureCategory = Field(
        description="Feature category"
    )
    source: FeatureSource = Field(
        description="Where the feature idea came from"
    )
    tags: List[str] = Field(
        default_factory=list,
        description="Tags for the feature"
    )


class RankedFeature(BaseModel):
    """Feature with priority ranking"""
    temp_id: str = Field(
        description="Temporary ID"
    )
    priority_score: int = Field(
        ge=1, le=100,
        description="Priority score 1-100"
    )
    priority: Literal["low", "medium", "high", "critical"] = Field(
        description="Priority level"
    )
    effort_estimate: Literal["small", "medium", "large", "xlarge"] = Field(
        description="Estimated effort to implement"
    )
    impact_estimate: Literal["low", "medium", "high"] = Field(
        description="Expected impact"
    )
    ranking_rationale: str = Field(
        description="Why this priority was assigned"
    )


class CandidateFeature(BaseModel):
    """Complete feature candidate for user review"""
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
    source: str


# =============================================================================
# REPO ANALYSIS (Input from GitHub)
# =============================================================================

class RepoFile(BaseModel):
    """A file from the repository"""
    path: str
    content: Optional[str] = None
    size: int = 0
    language: Optional[str] = None


class RepoAnalysis(BaseModel):
    """Analysis data from GitHub repository"""
    owner: str
    repo_name: str
    branch: str
    description: Optional[str] = None
    language: Optional[str] = None
    topics: List[str] = Field(default_factory=list)
    readme_content: Optional[str] = None
    file_tree: List[str] = Field(default_factory=list)
    key_files: List[RepoFile] = Field(default_factory=list)
    package_json: Optional[dict] = None
    requirements_txt: Optional[str] = None


# =============================================================================
# FEATURE DISCOVERY STATE
# =============================================================================

class FeatureDiscoveryState(TypedDict):
    """
    Shared state for the multi-agent feature discovery workflow.

    This state flows through all agents and accumulates outputs
    as each agent processes its part of the discovery.
    """

    # === Input ===
    project_id: str
    repo_analysis: dict  # RepoAnalysis as dict
    existing_features: List[dict]  # Features already in project
    user_context: Optional[str]  # Optional user guidance

    # === Agent Outputs ===
    code_analysis: Optional[dict]  # CodeAnalysisResult
    discovered_features: List[dict]  # List[DiscoveredFeature]
    gap_features: List[dict]  # List[GapFeature]
    tech_debt_features: List[dict]  # List[TechDebtFeature]
    enriched_features: List[dict]  # List[EnrichedFeature]
    ranked_features: List[dict]  # List[RankedFeature]

    # === Processing ===
    messages: Annotated[List[dict], operator.add]
    current_agent: str
    agent_history: List[str]

    # === Control ===
    max_features: int
    include_tech_debt: bool

    # === Final Result ===
    candidate_features: List[dict]  # List[CandidateFeature]
    status: Literal["pending", "in_progress", "success", "failed"]
    error_message: Optional[str]


def create_initial_discovery_state(
    project_id: str,
    repo_analysis: RepoAnalysis,
    existing_features: Optional[List[dict]] = None,
    user_context: Optional[str] = None,
    max_features: int = 15,
    include_tech_debt: bool = True,
) -> FeatureDiscoveryState:
    """
    Create the initial state for a new feature discovery workflow.

    Args:
        project_id: The project ID
        repo_analysis: Repository analysis data from GitHub
        existing_features: Features already in the project
        user_context: Optional user guidance
        max_features: Maximum number of features to discover
        include_tech_debt: Whether to include tech debt features

    Returns:
        Initial FeatureDiscoveryState ready for graph execution
    """
    return FeatureDiscoveryState(
        # Input
        project_id=project_id,
        repo_analysis=repo_analysis.model_dump() if isinstance(repo_analysis, BaseModel) else repo_analysis,
        existing_features=existing_features or [],
        user_context=user_context,

        # Agent Outputs
        code_analysis=None,
        discovered_features=[],
        gap_features=[],
        tech_debt_features=[],
        enriched_features=[],
        ranked_features=[],

        # Processing
        messages=[],
        current_agent="",
        agent_history=[],

        # Control
        max_features=max_features,
        include_tech_debt=include_tech_debt,

        # Result
        candidate_features=[],
        status="pending",
        error_message=None,
    )
