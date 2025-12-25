"""
Multi-Agent State Definition

Defines the shared state that flows through all specialized agents
in the multi-agent diagram generation workflow.
"""

from typing import TypedDict, Annotated, List, Optional, Literal, Any
from pydantic import BaseModel, Field
import operator


# =============================================================================
# AGENT OUTPUT MODELS
# =============================================================================

class ArchitecturePlan(BaseModel):
    """Output from the Architect Agent"""
    analysis: str = Field(description="Understanding of the architecture requirements")
    component_categories: List[str] = Field(
        description="Categories needed: applications, data, messaging, integration, security, observability, external"
    )
    suggested_patterns: List[str] = Field(
        description="Architectural patterns: microservices, event-driven, monolith, serverless, etc."
    )
    complexity_score: int = Field(ge=1, le=10, description="Complexity rating 1-10")
    estimated_nodes: int = Field(ge=1, description="Expected number of nodes")
    estimated_edges: int = Field(ge=0, description="Expected number of connections")
    special_requirements: List[str] = Field(
        default_factory=list,
        description="Special requirements: security, scale, compliance, etc."
    )


class VolumeMount(BaseModel):
    """Volume mount configuration"""
    name: str
    mountPath: str


class ComponentSpec(BaseModel):
    """Output from the Component Specialist Agent"""
    id: str = Field(description="Unique node ID (node_0, node_1, etc.)")
    nodeType: str = Field(description="One of the 39 available node types")
    label: str = Field(description="Display name for the component")
    tags: List[str] = Field(
        min_length=1,
        description="Technology-specific tags (NEVER generic like 'Database')"
    )
    volumes: Optional[List[VolumeMount]] = Field(
        default=None,
        description="Volume mounts for stateful components"
    )
    description: str = Field(description="Why this component was chosen")
    suggested_layer: int = Field(
        ge=0, le=5,
        description="Logical layer: 0=external, 1=frontend, 2=integration, 3=services, 4=data, 5=observability"
    )


class ConnectionSpec(BaseModel):
    """Output from the Connection Expert Agent"""
    id: str = Field(description="Unique edge ID (edge_0, edge_1, etc.)")
    source: str = Field(description="Source node ID")
    target: str = Field(description="Target node ID")
    label: str = Field(description="Protocol label (REST, gRPC, Kafka, PostgreSQL, etc.)")
    rationale: str = Field(description="Why this connection exists")


class GroupSpec(BaseModel):
    """Output from the Grouping Strategist Agent"""
    id: str = Field(description="Unique group ID (group_0, group_1, etc.)")
    label: str = Field(description="Display name (e.g., 'K8s Cluster', 'VPC')")
    tags: List[str] = Field(description="Group tags")
    node_ids: List[str] = Field(description="Node IDs to include in this group")
    rationale: str = Field(description="Why this grouping was created")


class LayoutPosition(BaseModel):
    """Output from the Layout Optimizer Agent"""
    node_id: str = Field(description="The node ID to position")
    layer: int = Field(ge=0, le=5, description="Logical layer 0-5")
    order: int = Field(ge=0, description="Position within layer (0 = leftmost)")
    x: int = Field(description="X coordinate (snapped to grid)")
    y: int = Field(description="Y coordinate (snapped to grid)")


class QualityReview(BaseModel):
    """Output from the Quality Reviewer Agent"""
    overall_score: int = Field(
        ge=1, le=10,
        description="Quality score 1-10 (8+ means approve)"
    )
    decision: Literal[
        "approve",
        "fix_components",
        "fix_connections",
        "fix_groups",
        "fix_layout",
        "restart"
    ] = Field(description="Decision for next step")
    issues: List[str] = Field(
        default_factory=list,
        description="Specific issues found"
    )
    suggestions: List[str] = Field(
        default_factory=list,
        description="Improvement suggestions"
    )
    target_agent: Optional[str] = Field(
        default=None,
        description="Which agent should fix the issues"
    )


# =============================================================================
# MULTI-AGENT STATE
# =============================================================================

class MultiAgentState(TypedDict):
    """
    Shared state for the multi-agent diagram generation workflow.

    This state flows through all agents and accumulates outputs
    as each agent processes its part of the request.
    """

    # === Input ===
    user_request: str
    module_type: Literal["flowchart", "diagrams", "mindmap"]
    context: Optional[dict]  # Existing diagram state
    conversation_history: List[dict]

    # === Agent Outputs ===
    architecture_plan: Optional[ArchitecturePlan]
    components: List[ComponentSpec]
    connections: List[ConnectionSpec]
    groups: List[GroupSpec]
    layout_positions: List[LayoutPosition]
    quality_review: Optional[QualityReview]

    # === Processing ===
    messages: Annotated[List[dict], operator.add]
    current_agent: str
    agent_history: List[str]  # Track which agents have run

    # === Retry Control ===
    attempt_number: int
    max_attempts: int
    review_iterations: int
    max_review_iterations: int

    # === Final Result ===
    final_diagram: Optional[dict]
    final_response: Optional[dict]
    status: Literal["pending", "in_progress", "success", "failed"]
    warnings: List[str]


def create_initial_multi_agent_state(
    user_request: str,
    module_type: Literal["flowchart", "diagrams", "mindmap"],
    context: Optional[dict] = None,
    conversation_history: Optional[List[dict]] = None,
    max_attempts: int = 3,
    max_review_iterations: int = 2
) -> MultiAgentState:
    """
    Create the initial state for a new multi-agent workflow.

    Args:
        user_request: The user's natural language request
        module_type: Which module to use (flowchart, diagrams, mindmap)
        context: Current state of the diagram (optional)
        conversation_history: Previous conversation messages
        max_attempts: Maximum retry attempts for the entire workflow
        max_review_iterations: Maximum review loop iterations

    Returns:
        Initial MultiAgentState ready for graph execution
    """
    return MultiAgentState(
        # Input
        user_request=user_request,
        module_type=module_type,
        context=context,
        conversation_history=conversation_history or [],

        # Agent Outputs
        architecture_plan=None,
        components=[],
        connections=[],
        groups=[],
        layout_positions=[],
        quality_review=None,

        # Processing
        messages=[],
        current_agent="",
        agent_history=[],

        # Retry
        attempt_number=0,
        max_attempts=max_attempts,
        review_iterations=0,
        max_review_iterations=max_review_iterations,

        # Result
        final_diagram=None,
        final_response=None,
        status="pending",
        warnings=[],
    )


# =============================================================================
# VALIDATION HELPERS
# =============================================================================

# Import from centralized node registry (single source of truth)
from .node_registry import (
    VALID_NODE_TYPES,
    VALID_PROTOCOLS,
    validate_node_type,
    validate_protocol,
)
