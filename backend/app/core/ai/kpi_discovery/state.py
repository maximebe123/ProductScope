"""
KPI Discovery State Definition

Defines the shared state that flows through all specialized agents
in the multi-agent KPI discovery workflow.

Focus: Business KPIs tied to the functional domain, NOT technical metrics.
"""

from typing import TypedDict, Annotated, List, Optional, Literal
from pydantic import BaseModel, Field
from enum import Enum
import operator


# =============================================================================
# ENUMS
# =============================================================================

class KPICategory(str, Enum):
    """Categories for business KPIs"""
    EFFICIENCY = "efficiency"       # Time savings, automation
    QUALITY = "quality"             # Accuracy, error reduction
    ADOPTION = "adoption"           # Engagement, feature usage
    REVENUE = "revenue"             # Conversion, ARPU, LTV
    SATISFACTION = "satisfaction"   # NPS, retention, churn
    GROWTH = "growth"               # User growth, market expansion
    OPERATIONAL = "operational"     # Process metrics, throughput


class KPIFrequency(str, Enum):
    """Measurement frequency for KPIs"""
    REALTIME = "realtime"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"


# =============================================================================
# AGENT OUTPUT MODELS
# =============================================================================

class DomainAnalysisResult(BaseModel):
    """Output from Domain Analyzer Agent"""
    business_domain: str = Field(
        description="Main business domain (e.g., 'e-commerce', 'SaaS', 'CRM', 'marketplace')"
    )
    business_problem: str = Field(
        description="What business problem the application solves"
    )
    target_users: List[str] = Field(
        description="Types of users (e.g., 'customers', 'admins', 'partners')"
    )
    core_workflows: List[str] = Field(
        description="Main business workflows (e.g., 'purchase', 'subscription', 'project management')"
    )
    measurable_entities: List[str] = Field(
        description="Entities that can be measured (e.g., 'orders', 'users', 'projects', 'tasks')"
    )
    existing_metrics: List[str] = Field(
        default_factory=list,
        description="Metrics that seem to already be tracked in the code"
    )
    business_model: str = Field(
        description="Business model type (e.g., 'SaaS', 'marketplace', 'B2B', 'B2C')"
    )
    value_propositions: List[str] = Field(
        default_factory=list,
        description="Key value propositions of the application"
    )


class DiscoveredKPI(BaseModel):
    """Raw KPI discovered from domain analysis"""
    temp_id: str = Field(
        description="Temporary ID for tracking (kpi_0, kpi_1, etc.)"
    )
    name: str = Field(
        description="Short KPI name (max 80 chars)"
    )
    definition: str = Field(
        description="Brief description of what this KPI measures"
    )
    category: KPICategory = Field(
        description="KPI category"
    )
    business_relevance: str = Field(
        description="Why this KPI is relevant to the business domain"
    )
    confidence: float = Field(
        ge=0, le=1,
        description="Confidence score 0-1 that this is measurable from the code"
    )


class EnrichedKPI(BaseModel):
    """Fully enriched KPI specification"""
    temp_id: str = Field(
        description="Temporary ID from original discovery"
    )
    name: str = Field(
        description="KPI name"
    )
    definition: str = Field(
        description="Clear definition of what this KPI measures"
    )
    category: KPICategory = Field(
        description="KPI category"
    )
    calculation_method: str = Field(
        description="Formula or method to calculate this KPI"
    )
    data_sources: List[str] = Field(
        description="Where in the code/database to find the data"
    )
    unit: Optional[str] = Field(
        default=None,
        description="Unit of measurement (%, count, time, currency)"
    )
    frequency: KPIFrequency = Field(
        description="How often this should be measured"
    )
    target_guidance: Optional[str] = Field(
        default=None,
        description="What a 'good' value looks like"
    )
    business_value: str = Field(
        description="How this KPI valorizes the application"
    )
    impact_areas: List[str] = Field(
        default_factory=list,
        description="Business areas impacted by this KPI"
    )


class RankedKPI(BaseModel):
    """KPI with priority ranking"""
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
    business_impact: Literal["low", "medium", "high"] = Field(
        description="Expected business impact"
    )
    implementation_complexity: Literal["low", "medium", "high"] = Field(
        description="How complex to implement tracking"
    )
    ranking_rationale: str = Field(
        description="Why this priority was assigned"
    )


class CandidateKPI(BaseModel):
    """Complete KPI candidate for user review"""
    temp_id: str
    name: str
    definition: str
    category: str  # Category value as string
    calculation_method: str
    data_sources: List[str] = Field(default_factory=list)
    unit: Optional[str] = None
    frequency: str  # Frequency value as string
    target_guidance: Optional[str] = None
    business_value: str
    priority: Literal["low", "medium", "high", "critical"]
    priority_score: int = Field(ge=1, le=100)
    impact_areas: List[str] = Field(default_factory=list)


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
# KPI DISCOVERY STATE
# =============================================================================

class KPIDiscoveryState(TypedDict):
    """
    Shared state for the multi-agent KPI discovery workflow.

    This state flows through all agents and accumulates outputs
    as each agent processes its part of the discovery.

    Pipeline: DomainAnalyzer -> KPIDiscoverer -> KPIEnricher -> ValueRanker
    """

    # === Input ===
    project_id: str
    repo_analysis: dict  # RepoAnalysis as dict
    existing_kpis: List[dict]  # KPIs already in project
    user_context: Optional[str]  # Optional user guidance

    # === Agent Outputs ===
    domain_analysis: Optional[dict]  # DomainAnalysisResult
    discovered_kpis: List[dict]  # List[DiscoveredKPI]
    enriched_kpis: List[dict]  # List[EnrichedKPI]
    ranked_kpis: List[dict]  # List[RankedKPI]

    # === Processing ===
    messages: Annotated[List[dict], operator.add]
    current_agent: str
    agent_history: List[str]

    # === Control ===
    max_kpis: int
    focus_categories: List[str]

    # === Final Result ===
    candidate_kpis: List[dict]  # List[CandidateKPI]
    status: Literal["pending", "in_progress", "success", "failed"]
    error_message: Optional[str]


def create_initial_kpi_discovery_state(
    project_id: str,
    repo_analysis: RepoAnalysis,
    existing_kpis: Optional[List[dict]] = None,
    user_context: Optional[str] = None,
    max_kpis: int = 10,
    focus_categories: Optional[List[str]] = None,
) -> KPIDiscoveryState:
    """
    Create the initial state for a new KPI discovery workflow.

    Args:
        project_id: The project ID
        repo_analysis: Repository analysis data from GitHub
        existing_kpis: KPIs already in the project
        user_context: Optional user guidance
        max_kpis: Maximum number of KPIs to discover
        focus_categories: Categories to focus on

    Returns:
        Initial KPIDiscoveryState ready for graph execution
    """
    return KPIDiscoveryState(
        # Input
        project_id=project_id,
        repo_analysis=repo_analysis.model_dump() if isinstance(repo_analysis, BaseModel) else repo_analysis,
        existing_kpis=existing_kpis or [],
        user_context=user_context,

        # Agent Outputs
        domain_analysis=None,
        discovered_kpis=[],
        enriched_kpis=[],
        ranked_kpis=[],

        # Processing
        messages=[],
        current_agent="",
        agent_history=[],

        # Control
        max_kpis=max_kpis,
        focus_categories=focus_categories or [],

        # Result
        candidate_kpis=[],
        status="pending",
        error_message=None,
    )
