from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class Position(BaseModel):
    """2D position on the canvas"""
    x: int
    y: int


class PositionedNodeData(BaseModel):
    """Node data for positioned diagram"""
    label: str
    nodeType: str
    tags: List[str] = []
    volumes: List[Dict[str, str]] = []
    isGroup: bool = False


class PositionedNode(BaseModel):
    """A node with calculated canvas position"""
    id: str
    type: str = "customNode"
    position: Position
    data: PositionedNodeData
    parentNode: Optional[str] = None
    extent: Optional[str] = None
    expandParent: Optional[bool] = None
    style: Optional[Dict[str, Any]] = None


class PositionedEdgeData(BaseModel):
    """Edge data for positioned diagram"""
    label: Optional[str] = None
    colorFromTarget: bool = False


class PositionedEdge(BaseModel):
    """An edge ready for ReactFlow"""
    id: str
    source: str
    target: str
    type: str = "custom"
    sourceHandle: Optional[str] = None
    targetHandle: Optional[str] = None
    data: Optional[PositionedEdgeData] = None


class PositionedDiagram(BaseModel):
    """Complete diagram ready for ProductScope import"""
    version: str = "1.0"
    name: str
    exportedAt: str = ""
    nodes: List[PositionedNode]
    edges: List[PositionedEdge]


class DiagramResponse(BaseModel):
    """API response for diagram generation"""
    success: bool
    diagram: Optional[PositionedDiagram] = None
    message: str
    error: Optional[str] = None
