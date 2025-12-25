"""Flowchart models for Mermaid.js based flowcharts"""

from pydantic import BaseModel
from typing import Optional, List, Literal

# AI execution mode
AIMode = Literal["advanced", "quick"]


class FlowchartContextNode(BaseModel):
    """Node in the flowchart context"""
    id: str
    label: str
    nodeType: str  # start_end, process, decision, data, subprocess, connector, etc.


class FlowchartContextEdge(BaseModel):
    """Edge in the flowchart context"""
    id: str
    source: str
    target: str
    label: Optional[str] = None


class FlowchartContextSubgraph(BaseModel):
    """Subgraph (swimlane) in the flowchart context"""
    id: str
    label: str


class FlowchartContext(BaseModel):
    """Current state of the flowchart"""
    nodes: List[FlowchartContextNode] = []
    edges: List[FlowchartContextEdge] = []
    subgraphs: List[FlowchartContextSubgraph] = []
    direction: str = "TB"
    mermaidCode: str = ""


class ConversationMessage(BaseModel):
    """Message in conversation history"""
    role: Literal["user", "assistant"]
    content: str


class FlowchartOperationRequest(BaseModel):
    """Request for a flowchart operation"""
    description: str
    context: Optional[FlowchartContext] = None
    conversation_history: Optional[List[ConversationMessage]] = None
    mode: AIMode = "advanced"


class FlowchartOperationResponse(BaseModel):
    """Response from a flowchart operation"""
    success: bool
    operation_type: str
    message: str

    # Full flowchart code (for generate operation)
    mermaid_code: Optional[str] = None

    # Incremental code changes (for modify operations)
    code_to_append: Optional[str] = None
    lines_to_remove: List[int] = []

    def is_full_generation(self) -> bool:
        """Check if this is a full flowchart generation"""
        return self.operation_type == "generate" and self.mermaid_code is not None


class ErrorResponse(BaseModel):
    """Error response"""
    detail: str
