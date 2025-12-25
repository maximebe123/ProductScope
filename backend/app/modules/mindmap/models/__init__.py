"""Mind Map models (Simplified xMind style)"""

from pydantic import BaseModel
from typing import Optional, List, Literal

# AI execution mode
AIMode = Literal["advanced", "quick"]


class MindMapContextNode(BaseModel):
    """Node in the mind map context"""
    id: str
    label: str
    nodeType: str  # topic, branch, note (only 3 types)


class MindMapContextEdge(BaseModel):
    """Edge in the mind map context"""
    id: str
    source: str
    target: str
    label: Optional[str] = None


class MindMapContext(BaseModel):
    """Current state of the mind map"""
    nodes: List[MindMapContextNode] = []
    edges: List[MindMapContextEdge] = []


class ConversationMessage(BaseModel):
    """Message in conversation history"""
    role: Literal["user", "assistant"]
    content: str


class MindMapOperationRequest(BaseModel):
    """Request for a mind map operation"""
    description: str
    context: Optional[MindMapContext] = None
    conversation_history: Optional[List[ConversationMessage]] = None
    mode: AIMode = "advanced"


class MindMapNode(BaseModel):
    """Node to be added/modified"""
    id: str
    label: str
    nodeType: str  # topic, branch, note
    position: Optional[dict] = None


class MindMapEdge(BaseModel):
    """Edge to be added/modified"""
    id: str
    source: str
    target: str
    label: Optional[str] = None


class NodeModification(BaseModel):
    """Modification to an existing node"""
    id: str
    label: Optional[str] = None
    nodeType: Optional[str] = None


class EdgeModification(BaseModel):
    """Modification to an existing edge"""
    id: str
    label: Optional[str] = None


class MindMapOperationResponse(BaseModel):
    """Response from a mind map operation"""
    success: bool
    operation_type: str
    message: str

    # Full mind map (for generate operation)
    mindmap: Optional[dict] = None

    # Incremental changes
    nodes_to_add: List[MindMapNode] = []
    nodes_to_modify: List[NodeModification] = []
    nodes_to_delete: List[str] = []
    edges_to_add: List[MindMapEdge] = []
    edges_to_modify: List[EdgeModification] = []
    edges_to_delete: List[str] = []

    def is_full_generation(self) -> bool:
        """Check if this is a full mind map generation"""
        return self.operation_type == "generate" and self.mindmap is not None


class ErrorResponse(BaseModel):
    """Error response"""
    detail: str
