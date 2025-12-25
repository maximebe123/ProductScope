"""
Mindmap Structure Validator

Validates MindElixir mindmap structure:
- Tree structure integrity
- Root node presence
- Node connectivity (no orphans)
"""

from typing import List, Set, Optional
from ..graph_state import ValidationError


async def validate_mindmap(tool_arguments: Optional[dict]) -> List[ValidationError]:
    """
    Validate mindmap operation arguments.

    Args:
        tool_arguments: The arguments from the LLM tool call

    Returns:
        List of ValidationError objects (empty if valid)
    """
    if not tool_arguments:
        return [ValidationError(
            error_type="schema",
            message="No tool arguments provided",
            suggestion="Tool call must include mindmap data"
        )]

    errors: List[ValidationError] = []

    # Check for mindmap generation
    if "root" in tool_arguments:
        root_errors = _validate_root(tool_arguments.get("root"))
        errors.extend(root_errors)

    # Check for node operations
    if "nodes" in tool_arguments:
        nodes_errors = _validate_nodes(tool_arguments.get("nodes", []))
        errors.extend(nodes_errors)

    # Check for branch operations
    if "parent_id" in tool_arguments:
        branch_errors = _validate_branch_operation(tool_arguments)
        errors.extend(branch_errors)

    return errors


def _validate_root(root: Optional[dict]) -> List[ValidationError]:
    """Validate root node structure."""
    errors: List[ValidationError] = []

    if not root:
        errors.append(ValidationError(
            error_type="schema",
            message="Mindmap missing root node",
            suggestion="Every mindmap must have a root node with 'topic' field"
        ))
        return errors

    if not isinstance(root, dict):
        errors.append(ValidationError(
            error_type="schema",
            message="Root must be an object",
            suggestion="Root should be {id, topic, children: []}"
        ))
        return errors

    # Check required fields
    if not root.get("topic"):
        errors.append(ValidationError(
            error_type="schema",
            message="Root node missing 'topic' field",
            suggestion="Root must have a topic (the central idea)"
        ))

    # Validate children recursively
    if "children" in root:
        children_errors = _validate_children(root.get("children", []), depth=0)
        errors.extend(children_errors)

    return errors


def _validate_children(children: List[dict], depth: int = 0) -> List[ValidationError]:
    """Recursively validate child nodes."""
    errors: List[ValidationError] = []

    if not isinstance(children, list):
        errors.append(ValidationError(
            error_type="schema",
            message=f"Children at depth {depth} is not a list",
            suggestion="Children must be an array of node objects"
        ))
        return errors

    if depth > 10:
        errors.append(ValidationError(
            error_type="semantic",
            message="Mindmap exceeds maximum depth of 10 levels",
            suggestion="Consider restructuring to reduce depth"
        ))
        return errors

    seen_ids: Set[str] = set()

    for i, child in enumerate(children):
        if not isinstance(child, dict):
            errors.append(ValidationError(
                error_type="schema",
                message=f"Child {i} at depth {depth} is not an object",
                suggestion="Each child must be {id, topic, children: []}"
            ))
            continue

        # Check for topic
        if not child.get("topic"):
            errors.append(ValidationError(
                error_type="schema",
                message=f"Child node at depth {depth}, index {i} missing 'topic'",
                suggestion="Every node must have a topic"
            ))

        # Check for duplicate IDs
        child_id = child.get("id")
        if child_id:
            if child_id in seen_ids:
                errors.append(ValidationError(
                    error_type="schema",
                    message=f"Duplicate node id '{child_id}' at depth {depth}",
                    suggestion="Each node must have a unique id"
                ))
            seen_ids.add(child_id)

        # Recurse into grandchildren
        if "children" in child:
            child_errors = _validate_children(child.get("children", []), depth + 1)
            errors.extend(child_errors)

    return errors


def _validate_nodes(nodes: List[dict]) -> List[ValidationError]:
    """Validate a list of nodes for add/modify operations."""
    errors: List[ValidationError] = []

    for i, node in enumerate(nodes):
        if not isinstance(node, dict):
            errors.append(ValidationError(
                error_type="schema",
                message=f"Node {i} is not an object",
                suggestion="Each node must be {id, topic}"
            ))
            continue

        if not node.get("topic") and not node.get("label"):
            errors.append(ValidationError(
                error_type="schema",
                message=f"Node {i} missing 'topic' or 'label'",
                suggestion="Every node must have a topic"
            ))

    return errors


def _validate_branch_operation(args: dict) -> List[ValidationError]:
    """Validate branch expansion/addition operations."""
    errors: List[ValidationError] = []

    parent_id = args.get("parent_id")
    if not parent_id:
        errors.append(ValidationError(
            error_type="schema",
            message="Branch operation missing 'parent_id'",
            suggestion="Specify which node to add children to"
        ))

    # Check for children to add
    new_children = args.get("children") or args.get("new_branches") or args.get("ideas")
    if not new_children:
        errors.append(ValidationError(
            error_type="semantic",
            message="Branch operation has no children to add",
            suggestion="Provide 'children' array with new branch nodes"
        ))
    elif not isinstance(new_children, list):
        errors.append(ValidationError(
            error_type="schema",
            message="Children must be an array",
            suggestion="Provide children as [{topic: '...'}, ...]"
        ))
    elif len(new_children) == 0:
        errors.append(ValidationError(
            error_type="semantic",
            message="Children array is empty",
            suggestion="Provide at least one child node"
        ))

    return errors
