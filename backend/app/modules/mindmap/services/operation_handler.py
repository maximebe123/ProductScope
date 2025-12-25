"""Mind Map Operation Handler (Simplified xMind style)"""

import logging
from typing import Optional
import uuid

from app.modules.mindmap.models import (
    MindMapContext,
    MindMapOperationResponse,
    MindMapNode,
    MindMapEdge,
    NodeModification,
    EdgeModification,
)
from app.modules.mindmap.services.ai_tools import VALID_NODE_TYPES

logger = logging.getLogger(__name__)


def generate_id() -> str:
    """Generate a unique ID for nodes/edges"""
    return f"mindmap-{uuid.uuid4().hex[:8]}"


def normalize_node_type(node_type: str) -> str:
    """Normalize node type to valid value (topic, branch, note)"""
    node_type = node_type.lower().strip()

    # Direct match
    if node_type in VALID_NODE_TYPES:
        return node_type

    # Common mappings to simplified types
    mappings = {
        # Topic variations
        "central": "topic",
        "main": "topic",
        "root": "topic",
        # Branch variations (everything that's an idea goes here)
        "subtopic": "branch",
        "sub": "branch",
        "concept": "branch",
        "thought": "branch",
        "idea": "branch",
        "question": "branch",
        "task": "branch",
        "todo": "branch",
        "action": "branch",
        "link": "branch",
        "reference": "branch",
        "url": "branch",
        "image": "branch",
        "group": "branch",
        # Note variations
        "comment": "note",
        "detail": "note",
        "annotation": "note",
    }

    return mappings.get(node_type, "branch")


class MindMapOperationHandler:
    """Handles mind map operations from AI tool calls"""

    def handle_tool_call(
        self,
        tool_name: str,
        arguments: dict,
        context: Optional[MindMapContext] = None
    ) -> MindMapOperationResponse:
        """Process a tool call and return the operation response"""

        handlers = {
            "generate_mindmap": self._handle_generate,
            "add_nodes": self._handle_add_nodes,
            "modify_nodes": self._handle_modify_nodes,
            "delete_nodes": self._handle_delete_nodes,
            "add_edges": self._handle_add_edges,
            "modify_edges": self._handle_modify_edges,
            "delete_edges": self._handle_delete_edges,
            "expand_branch": self._handle_expand_branch,
        }

        handler = handlers.get(tool_name)
        if not handler:
            return MindMapOperationResponse(
                success=False,
                operation_type="unknown",
                message=f"Unknown tool: {tool_name}"
            )

        try:
            return handler(arguments, context)
        except Exception as e:
            logger.error(f"Error handling {tool_name}: {e}", exc_info=True)
            return MindMapOperationResponse(
                success=False,
                operation_type=tool_name,
                message=f"Error: {str(e)}"
            )

    def _handle_generate(
        self, args: dict, context: Optional[MindMapContext]
    ) -> MindMapOperationResponse:
        """Handle full mind map generation - returns MindElixir tree format"""
        topic = args.get("topic", "Mind Map")
        raw_nodes = args.get("nodes", [])
        raw_edges = args.get("edges", [])

        # Build ID map for new IDs
        id_map = {}
        for i, node in enumerate(raw_nodes):
            old_id = node.get("id", generate_id())
            new_id = f"me-{generate_id()}"
            id_map[old_id] = new_id

        # Build children map from edges
        children_map = {}  # parent_id -> [child_ids]
        for edge in raw_edges:
            source = id_map.get(edge.get("source"), edge.get("source"))
            target = id_map.get(edge.get("target"), edge.get("target"))
            if source not in children_map:
                children_map[source] = []
            children_map[source].append(target)

        # Find the root node (topic type)
        root_node = None
        nodes_by_id = {}

        for node in raw_nodes:
            old_id = node.get("id")
            new_id = id_map.get(old_id, old_id)
            node_type = normalize_node_type(node.get("nodeType", "branch"))

            node_data = {
                "id": new_id,
                "topic": node.get("label", "Node"),
                "nodeType": node_type,
            }

            # Apply note style if it's a note
            if node_type == "note":
                node_data["style"] = {
                    "background": "#fff9e6",
                    "color": "#cca600",
                    "fontSize": "12px",
                    "border": "1px solid #ffcf00"
                }

            nodes_by_id[new_id] = node_data

            if node_type == "topic":
                root_node = node_data

        # If no explicit topic, use first node as root
        if not root_node and nodes_by_id:
            first_id = list(nodes_by_id.keys())[0]
            root_node = nodes_by_id[first_id]

        if not root_node:
            # Create default root
            root_node = {
                "id": generate_id(),
                "topic": topic,
                "children": []
            }

        # Build tree recursively
        def build_tree(node_id: str) -> dict:
            node = nodes_by_id.get(node_id, {"id": node_id, "topic": "Unknown"})
            child_ids = children_map.get(node_id, [])

            result = {
                "id": node["id"],
                "topic": node["topic"],
                "children": [build_tree(cid) for cid in child_ids]
            }

            # Add style if present
            if "style" in node:
                result["style"] = node["style"]

            return result

        # Build the MindElixir tree structure
        mindmap_data = {
            "nodeData": build_tree(root_node["id"])
        }

        node_count = len(raw_nodes)
        edge_count = len(raw_edges)

        return MindMapOperationResponse(
            success=True,
            operation_type="generate",
            message=f"Generated mind map '{topic}' with {node_count} nodes and {edge_count} connections",
            mindmap=mindmap_data
        )

    def _handle_add_nodes(
        self, args: dict, context: Optional[MindMapContext]
    ) -> MindMapOperationResponse:
        """Handle adding nodes"""
        raw_nodes = args.get("nodes", [])
        raw_edges = args.get("edges", [])

        # Get existing node count for ID generation
        existing_count = len(context.nodes) if context else 0

        nodes_to_add = []
        edges_to_add = []
        id_map = {}

        for i, node in enumerate(raw_nodes):
            old_id = node.get("id", generate_id())
            new_id = f"mindmap-node-{existing_count + i + 1}"
            id_map[old_id] = new_id

            node_type = normalize_node_type(node.get("nodeType", "branch"))

            nodes_to_add.append(MindMapNode(
                id=new_id,
                label=node.get("label", "New Node"),
                nodeType=node_type,
                position={"x": 400 + (i * 50), "y": 300 + (i * 30)},
            ))

        existing_edge_count = len(context.edges) if context else 0

        for i, edge in enumerate(raw_edges):
            source = edge.get("source")
            target = edge.get("target")

            # Map new node IDs
            if source in id_map:
                source = id_map[source]
            if target in id_map:
                target = id_map[target]

            edges_to_add.append(MindMapEdge(
                id=f"mindmap-edge-{existing_edge_count + i + 1}",
                source=source,
                target=target,
            ))

        return MindMapOperationResponse(
            success=True,
            operation_type="add",
            message=f"Added {len(nodes_to_add)} nodes and {len(edges_to_add)} connections",
            nodes_to_add=nodes_to_add,
            edges_to_add=edges_to_add,
        )

    def _handle_modify_nodes(
        self, args: dict, context: Optional[MindMapContext]
    ) -> MindMapOperationResponse:
        """Handle modifying nodes"""
        modifications = args.get("modifications", [])

        nodes_to_modify = []
        for mod in modifications:
            node_mod = NodeModification(id=mod["id"])
            if "label" in mod:
                node_mod.label = mod["label"]
            if "nodeType" in mod:
                node_mod.nodeType = normalize_node_type(mod["nodeType"])
            nodes_to_modify.append(node_mod)

        return MindMapOperationResponse(
            success=True,
            operation_type="modify",
            message=f"Modified {len(nodes_to_modify)} nodes",
            nodes_to_modify=nodes_to_modify,
        )

    def _handle_delete_nodes(
        self, args: dict, context: Optional[MindMapContext]
    ) -> MindMapOperationResponse:
        """Handle deleting nodes"""
        node_ids = args.get("node_ids", [])

        return MindMapOperationResponse(
            success=True,
            operation_type="delete",
            message=f"Deleted {len(node_ids)} nodes",
            nodes_to_delete=node_ids,
        )

    def _handle_add_edges(
        self, args: dict, context: Optional[MindMapContext]
    ) -> MindMapOperationResponse:
        """Handle adding edges"""
        raw_edges = args.get("edges", [])
        existing_count = len(context.edges) if context else 0

        edges_to_add = []
        for i, edge in enumerate(raw_edges):
            edges_to_add.append(MindMapEdge(
                id=f"mindmap-edge-{existing_count + i + 1}",
                source=edge["source"],
                target=edge["target"],
                label=edge.get("label"),
            ))

        return MindMapOperationResponse(
            success=True,
            operation_type="connect",
            message=f"Added {len(edges_to_add)} connections",
            edges_to_add=edges_to_add,
        )

    def _handle_modify_edges(
        self, args: dict, context: Optional[MindMapContext]
    ) -> MindMapOperationResponse:
        """Handle modifying edges"""
        modifications = args.get("modifications", [])

        edges_to_modify = []
        for mod in modifications:
            edge_mod = EdgeModification(id=mod["id"])
            if "label" in mod:
                edge_mod.label = mod["label"]
            edges_to_modify.append(edge_mod)

        return MindMapOperationResponse(
            success=True,
            operation_type="modify_edges",
            message=f"Modified {len(edges_to_modify)} edges",
            edges_to_modify=edges_to_modify,
        )

    def _handle_delete_edges(
        self, args: dict, context: Optional[MindMapContext]
    ) -> MindMapOperationResponse:
        """Handle deleting edges"""
        edge_ids = args.get("edge_ids", [])

        return MindMapOperationResponse(
            success=True,
            operation_type="disconnect",
            message=f"Removed {len(edge_ids)} connections",
            edges_to_delete=edge_ids,
        )

    def _handle_expand_branch(
        self, args: dict, context: Optional[MindMapContext]
    ) -> MindMapOperationResponse:
        """Handle expanding a branch with sub-ideas"""
        parent_id = args.get("node_id")
        raw_nodes = args.get("nodes", [])

        if not parent_id:
            return MindMapOperationResponse(
                success=False,
                operation_type="expand",
                message="No parent node specified for expansion"
            )

        existing_count = len(context.nodes) if context else 0
        existing_edge_count = len(context.edges) if context else 0

        nodes_to_add = []
        edges_to_add = []

        for i, node in enumerate(raw_nodes):
            new_id = f"mindmap-node-{existing_count + i + 1}"
            node_type = normalize_node_type(node.get("nodeType", "branch"))

            nodes_to_add.append(MindMapNode(
                id=new_id,
                label=node.get("label", "Sub-idea"),
                nodeType=node_type,
                position={"x": 500 + (i * 50), "y": 250 + (i * 60)},
            ))

            # Connect to parent
            edges_to_add.append(MindMapEdge(
                id=f"mindmap-edge-{existing_edge_count + i + 1}",
                source=parent_id,
                target=new_id,
            ))

        return MindMapOperationResponse(
            success=True,
            operation_type="expand",
            message=f"Expanded branch with {len(nodes_to_add)} sub-ideas",
            nodes_to_add=nodes_to_add,
            edges_to_add=edges_to_add,
        )

    def _get_react_flow_type(self, node_type: str) -> str:
        """Map node type to ReactFlow component type"""
        if node_type == "note":
            return "noteNode"
        # Both 'topic' and 'branch' use mindMapNode
        return "mindMapNode"


# Singleton instance
mindmap_operation_handler = MindMapOperationHandler()
