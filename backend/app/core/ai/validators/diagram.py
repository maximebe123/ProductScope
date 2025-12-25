"""
Diagram Schema Validator

Validates ReactFlow diagram structure:
- Node schema (id, label, type, position)
- Edge schema (id, source, target)
- Reference integrity (edges reference existing nodes)
"""

from typing import List, Optional, Set
from ..graph_state import ValidationError


# Valid node types for Solution Architecture diagrams (39 types)
VALID_NODE_TYPES = {
    # Applications (6)
    "webapp", "mobile", "backend", "api", "function", "worker",
    # Data (7)
    "sql", "nosql", "keyvalue", "graph", "cache", "storage", "datalake",
    # Messaging (5)
    "queue", "stream", "pubsub", "eventbus", "webhook",
    # Integration (6)
    "gateway", "mesh", "bff", "loadbalancer", "cdn", "etl",
    # Security (5)
    "idp", "auth", "secrets", "waf", "certificate",
    # Observability (5)
    "logging", "metrics", "tracing", "alerting", "dashboard",
    # External (5)
    "actor", "thirdparty", "legacy", "partner", "cloud",
}


async def validate_diagram(tool_arguments: Optional[dict]) -> List[ValidationError]:
    """
    Validate diagram operation arguments.

    Args:
        tool_arguments: The arguments from the LLM tool call

    Returns:
        List of ValidationError objects (empty if valid)
    """
    if not tool_arguments:
        return [ValidationError(
            error_type="schema",
            message="No tool arguments provided",
            suggestion="Tool call must include diagram data"
        )]

    errors: List[ValidationError] = []

    # Check for generate_diagram structure
    if "nodes" in tool_arguments:
        node_errors = _validate_nodes(tool_arguments.get("nodes", []))
        errors.extend(node_errors)

    if "edges" in tool_arguments:
        edge_errors = _validate_edges(
            tool_arguments.get("edges", []),
            tool_arguments.get("nodes", [])
        )
        errors.extend(edge_errors)

    # Check for node modifications
    if "node_id" in tool_arguments:
        mod_errors = _validate_node_modification(tool_arguments)
        errors.extend(mod_errors)

    return errors


def _validate_nodes(nodes: List[dict]) -> List[ValidationError]:
    """Validate node schema and types."""
    errors: List[ValidationError] = []
    seen_ids: Set[str] = set()

    for i, node in enumerate(nodes):
        # Check required fields
        if not isinstance(node, dict):
            errors.append(ValidationError(
                error_type="schema",
                message=f"Node {i} is not a dictionary",
                suggestion="Each node must be an object with id, label, and type"
            ))
            continue

        node_id = node.get("id")
        if not node_id:
            errors.append(ValidationError(
                error_type="schema",
                message=f"Node {i} missing 'id' field",
                suggestion="Every node must have a unique id"
            ))
        elif node_id in seen_ids:
            errors.append(ValidationError(
                error_type="schema",
                message=f"Duplicate node id: '{node_id}'",
                suggestion="Each node must have a unique id"
            ))
        else:
            seen_ids.add(node_id)

        if not node.get("label"):
            errors.append(ValidationError(
                error_type="schema",
                message=f"Node '{node_id or i}' missing 'label' field",
                suggestion="Every node must have a label"
            ))

        node_type = node.get("type") or node.get("nodeType")
        if node_type and node_type.lower() not in VALID_NODE_TYPES:
            errors.append(ValidationError(
                error_type="semantic",
                message=f"Unknown node type '{node_type}' for node '{node_id}'",
                suggestion=f"Use one of: {', '.join(sorted(VALID_NODE_TYPES)[:10])}..."
            ))

        # Check position if provided
        if "x" in node or "y" in node:
            x = node.get("x")
            y = node.get("y")
            if not isinstance(x, (int, float)) or not isinstance(y, (int, float)):
                errors.append(ValidationError(
                    error_type="schema",
                    message=f"Node '{node_id}' has invalid position values",
                    suggestion="Position x and y must be numbers"
                ))

    return errors


def _validate_edges(edges: List[dict], nodes: List[dict]) -> List[ValidationError]:
    """Validate edge schema and reference integrity."""
    errors: List[ValidationError] = []

    # Build set of valid node IDs
    valid_node_ids: Set[str] = {
        node.get("id") for node in nodes if isinstance(node, dict) and node.get("id")
    }

    seen_edge_ids: Set[str] = set()

    for i, edge in enumerate(edges):
        if not isinstance(edge, dict):
            errors.append(ValidationError(
                error_type="schema",
                message=f"Edge {i} is not a dictionary",
                suggestion="Each edge must be an object with source and target"
            ))
            continue

        edge_id = edge.get("id")
        if edge_id and edge_id in seen_edge_ids:
            errors.append(ValidationError(
                error_type="schema",
                message=f"Duplicate edge id: '{edge_id}'",
                suggestion="Each edge must have a unique id"
            ))
        elif edge_id:
            seen_edge_ids.add(edge_id)

        source = edge.get("source")
        target = edge.get("target")

        if not source:
            errors.append(ValidationError(
                error_type="schema",
                message=f"Edge {edge_id or i} missing 'source' field",
                suggestion="Every edge must have a source node"
            ))
        elif valid_node_ids and source not in valid_node_ids:
            errors.append(ValidationError(
                error_type="semantic",
                message=f"Edge references unknown source node '{source}'",
                suggestion=f"Source must be one of: {', '.join(sorted(valid_node_ids)[:5])}..."
            ))

        if not target:
            errors.append(ValidationError(
                error_type="schema",
                message=f"Edge {edge_id or i} missing 'target' field",
                suggestion="Every edge must have a target node"
            ))
        elif valid_node_ids and target not in valid_node_ids:
            errors.append(ValidationError(
                error_type="semantic",
                message=f"Edge references unknown target node '{target}'",
                suggestion=f"Target must be one of: {', '.join(sorted(valid_node_ids)[:5])}..."
            ))

    return errors


def _validate_node_modification(args: dict) -> List[ValidationError]:
    """Validate node modification arguments."""
    errors: List[ValidationError] = []

    node_id = args.get("node_id")
    if not node_id:
        errors.append(ValidationError(
            error_type="schema",
            message="Node modification missing 'node_id'",
            suggestion="Specify which node to modify"
        ))

    # At least one modification should be present
    modification_fields = ["new_label", "tags_to_add", "tags_to_remove", "new_parent", "volumes"]
    has_modification = any(args.get(field) for field in modification_fields)

    if not has_modification:
        errors.append(ValidationError(
            error_type="semantic",
            message="Node modification has no changes specified",
            suggestion=f"Provide at least one of: {', '.join(modification_fields)}"
        ))

    return errors
