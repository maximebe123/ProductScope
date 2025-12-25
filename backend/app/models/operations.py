"""Models for AI diagram operations (CRUD)"""

from typing import List, Optional, Literal
from pydantic import BaseModel, Field

# AI execution mode
AIMode = Literal["advanced", "quick"]

from app.models.diagram import VolumeAttachment
from app.models.responses import PositionedNode, PositionedEdge, PositionedDiagram


# =============================================================================
# Context Models - What the AI sees about the existing diagram
# =============================================================================

class ContextNode(BaseModel):
    """Simplified node representation for AI context"""
    id: str
    label: str
    nodeType: Optional[str] = "group"  # Optional for group nodes
    tags: List[str] = []
    volumes: List[VolumeAttachment] = []
    parentGroup: Optional[str] = None
    isGroup: bool = False


class ContextEdge(BaseModel):
    """Simplified edge representation for AI context"""
    id: str
    source: str
    target: str
    label: Optional[str] = None


class DiagramContext(BaseModel):
    """Current diagram state passed to AI"""
    nodes: List[ContextNode] = []
    edges: List[ContextEdge] = []


# =============================================================================
# Request Models
# =============================================================================

class ConversationMessage(BaseModel):
    """A message in the conversation history"""
    role: Literal["user", "assistant"]
    content: str


class OperationRequest(BaseModel):
    """Request to execute an AI diagram operation"""
    description: str = Field(..., description="Natural language instruction from user")
    context: Optional[DiagramContext] = Field(
        default=None,
        description="Current diagram state for context-aware operations"
    )
    conversation_history: Optional[List[ConversationMessage]] = Field(
        default=None,
        description="Previous messages in the conversation for context"
    )
    mode: AIMode = Field(
        default="advanced",
        description="AI execution mode: 'advanced' for multi-agent pipeline, 'quick' for single-shot"
    )


# =============================================================================
# Modification Models - Incremental changes
# =============================================================================

class NodeModification(BaseModel):
    """Modifications to apply to an existing node"""
    node_id: str = Field(..., description="ID of node to modify")
    new_label: Optional[str] = None
    new_tags: Optional[List[str]] = Field(default=None, description="Replace all tags")
    add_tags: Optional[List[str]] = Field(default=None, description="Tags to add")
    remove_tags: Optional[List[str]] = Field(default=None, description="Tags to remove")
    add_volumes: Optional[List[VolumeAttachment]] = None
    new_parent_group: Optional[str] = Field(default=None, description="Move to different group")


class EdgeModification(BaseModel):
    """Modifications to apply to an existing edge"""
    edge_id: str = Field(..., description="ID of edge to modify")
    new_label: Optional[str] = None
    new_source: Optional[str] = None
    new_target: Optional[str] = None


class GroupCreation(BaseModel):
    """Instructions to create a new group from existing nodes"""
    group_id: str
    group_label: str
    group_tags: List[str] = []
    node_ids: List[str] = Field(..., description="Existing nodes to include")


# =============================================================================
# Response Models
# =============================================================================

OperationType = Literal["generate", "add", "modify", "delete", "connect", "disconnect", "group"]


class OperationResponse(BaseModel):
    """Response from AI operation - can be full replacement or incremental merge"""
    success: bool = True
    operation_type: OperationType
    message: str = Field(..., description="Human-readable description of what was done")

    # For full diagram generation (operation_type == "generate")
    diagram: Optional[PositionedDiagram] = None

    # For incremental operations (merge with existing)
    nodes_to_add: List[PositionedNode] = []
    nodes_to_modify: List[NodeModification] = []
    nodes_to_delete: List[str] = []
    edges_to_add: List[PositionedEdge] = []
    edges_to_modify: List[EdgeModification] = []
    edges_to_delete: List[str] = []
    groups_to_create: List[GroupCreation] = []

    def is_full_generation(self) -> bool:
        """Check if this is a full diagram replacement"""
        return self.operation_type == "generate" and self.diagram is not None

    def is_incremental(self) -> bool:
        """Check if this has incremental changes"""
        return (
            len(self.nodes_to_add) > 0 or
            len(self.nodes_to_modify) > 0 or
            len(self.nodes_to_delete) > 0 or
            len(self.edges_to_add) > 0 or
            len(self.edges_to_modify) > 0 or
            len(self.edges_to_delete) > 0 or
            len(self.groups_to_create) > 0
        )


class ErrorResponse(BaseModel):
    """Error response for failed operations"""
    success: bool = False
    error: str
    details: Optional[str] = None
