"""
Finalizer Agent

Compiles the final JSON output from all agent outputs.
Uses GPT-4o for reliable JSON generation.
"""

import logging
from typing import Any, Dict, List

from openai import AsyncOpenAI
from pydantic import BaseModel

from app.config import settings
from app.core.ai.agent_state import MultiAgentState

logger = logging.getLogger(__name__)

# Lazy-loaded OpenAI client
_client = None


def get_openai_client() -> AsyncOpenAI:
    """Get or create OpenAI client singleton."""
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


class NodePosition(BaseModel):
    x: int
    y: int


class NodeData(BaseModel):
    label: str
    nodeType: str
    tags: List[str]
    volumes: List[dict] = []
    isGroup: bool = False


class FinalNode(BaseModel):
    id: str
    type: str
    position: NodePosition
    data: NodeData
    parentId: str | None = None


class FinalEdge(BaseModel):
    id: str
    source: str
    target: str
    label: str
    type: str = "smoothstep"
    animated: bool = True


class FinalGroup(BaseModel):
    id: str
    type: str = "groupNode"
    position: NodePosition
    data: NodeData
    style: dict


class FinalDiagram(BaseModel):
    nodes: List[FinalNode]
    edges: List[FinalEdge]
    groups: List[FinalGroup] = []


async def finalizer_agent(state: MultiAgentState) -> Dict[str, Any]:
    """
    Finalizer: Compiles final JSON output.

    Uses deterministic compilation (no LLM needed for this step).

    Args:
        state: Current multi-agent state

    Returns:
        Dict with final_diagram, final_response, and status
    """
    logger.info("[Finalizer] Compiling final diagram")

    components = state.get("components", [])
    connections = state.get("connections", [])
    groups = state.get("groups", [])
    layout_positions = state.get("layout_positions", [])
    warnings = state.get("warnings", [])

    # Create position lookup
    pos_lookup = {p.node_id: p for p in layout_positions}

    # Build node-to-group lookup
    node_to_group = {}
    for group in groups:
        for node_id in group.node_ids:
            node_to_group[node_id] = group.id

    # Compile nodes
    final_nodes = []
    for comp in components:
        pos = pos_lookup.get(comp.id)
        x = pos.x if pos else 100
        y = pos.y if pos else 100

        final_nodes.append(FinalNode(
            id=comp.id,
            type="customNode",
            position=NodePosition(x=x, y=y),
            data=NodeData(
                label=comp.label,
                nodeType=comp.nodeType,
                tags=comp.tags,
                volumes=[v.model_dump() for v in comp.volumes] if comp.volumes else [],
                isGroup=False
            ),
            parentId=node_to_group.get(comp.id)
        ))

    # Compile edges
    final_edges = []
    for conn in connections:
        final_edges.append(FinalEdge(
            id=conn.id,
            source=conn.source,
            target=conn.target,
            label=conn.label,
            type="smoothstep",
            animated=True
        ))

    # Compile groups
    final_groups = []
    for group in groups:
        # Calculate group bounds from contained nodes
        contained_positions = [pos_lookup[nid] for nid in group.node_ids if nid in pos_lookup]

        if contained_positions:
            min_x = min(p.x for p in contained_positions)
            max_x = max(p.x for p in contained_positions)
            min_y = min(p.y for p in contained_positions)
            max_y = max(p.y for p in contained_positions)

            # Add padding
            padding = 48
            node_width = 180
            node_height = 100

            width = (max_x - min_x) + node_width + (padding * 2)
            height = (max_y - min_y) + node_height + (padding * 2)
            pos_x = min_x - padding
            pos_y = min_y - padding
        else:
            # Default size if no positions
            width, height = 400, 200
            pos_x, pos_y = 100, 100

        final_groups.append(FinalGroup(
            id=group.id,
            type="groupNode",
            position=NodePosition(x=pos_x, y=pos_y),
            data=NodeData(
                label=group.label,
                nodeType="group",
                tags=group.tags,
                isGroup=True
            ),
            style={"width": width, "height": height}
        ))

    # Create final diagram
    diagram = FinalDiagram(
        nodes=final_nodes,
        edges=final_edges,
        groups=final_groups
    )

    # Combine groups and nodes for ReactFlow
    # Groups must be in the nodes array and come BEFORE their children
    all_nodes = []

    # Create group position lookup for relative positioning
    group_positions = {g.id: g.position for g in final_groups}

    # Add groups first (they must be defined before child nodes reference them)
    for group in final_groups:
        all_nodes.append({
            "id": group.id,
            "type": "groupNode",
            "position": {"x": group.position.x, "y": group.position.y},
            "data": group.data.model_dump(),
            "style": group.style,
        })

    # Add regular nodes (with parentId references to groups)
    for node in final_nodes:
        node_dict = node.model_dump()
        # ReactFlow positions children relative to parent
        parent_id = node_dict.get("parentId")
        if parent_id and parent_id in group_positions:
            # Convert absolute position to relative position
            parent_pos = group_positions[parent_id]
            # Add padding offset (groups have padding of 48)
            padding = 48
            node_dict["position"]["x"] = node_dict["position"]["x"] - parent_pos.x + padding
            node_dict["position"]["y"] = node_dict["position"]["y"] - parent_pos.y + padding
        all_nodes.append(node_dict)

    # Create response
    response = {
        "success": True,
        "operation_type": "generate",
        "message": f"Generated diagram with {len(final_nodes)} nodes, {len(final_groups)} groups, and {len(final_edges)} connections",
        "diagram": {
            "version": "1.0",
            "name": "Generated Diagram",
            "nodes": all_nodes,
            "edges": [e.model_dump() for e in final_edges],
        }
    }

    if warnings:
        response["warnings"] = warnings

    logger.info(
        f"[Finalizer] Compiled: {len(final_nodes)} nodes, "
        f"{len(final_edges)} edges, {len(final_groups)} groups"
    )

    # Update agent history
    agent_history = state.get("agent_history", []).copy()
    agent_history.append("finalizer")

    return {
        "final_diagram": diagram.model_dump(),
        "final_response": response,
        "current_agent": "finalizer",
        "agent_history": agent_history,
        "status": "success",
        "messages": [{
            "role": "system",
            "content": f"[Finalizer] Diagram compiled successfully"
        }]
    }
