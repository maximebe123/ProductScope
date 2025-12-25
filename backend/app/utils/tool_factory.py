"""
Tool Definition Factory

Provides helpers for creating OpenAI function tool definitions
with consistent structure and reduced boilerplate.
"""

from typing import Any, Dict, List, Optional


def create_tool(
    name: str,
    description: str,
    parameters: Dict[str, Any],
    required: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Create an OpenAI function tool definition.

    Args:
        name: Tool function name
        description: Description of what the tool does
        parameters: Parameter definitions (as properties dict)
        required: List of required parameter names

    Returns:
        Complete tool definition dict

    Example:
        create_tool(
            name="add_nodes",
            description="Add nodes to the diagram",
            parameters={
                "nodes": {
                    "type": "array",
                    "description": "Nodes to add",
                    "items": node_schema,
                }
            },
            required=["nodes"]
        )
    """
    return {
        "type": "function",
        "function": {
            "name": name,
            "description": description,
            "parameters": {
                "type": "object",
                "properties": parameters,
                "required": required or [],
            },
        },
    }


def create_string_param(
    description: str,
    enum: Optional[List[str]] = None,
    default: Optional[str] = None,
) -> Dict[str, Any]:
    """Create a string parameter definition."""
    param = {"type": "string", "description": description}
    if enum:
        param["enum"] = enum
    if default:
        param["default"] = default
    return param


def create_array_param(
    description: str,
    items: Dict[str, Any],
) -> Dict[str, Any]:
    """Create an array parameter definition."""
    return {
        "type": "array",
        "description": description,
        "items": items,
    }


def create_object_param(
    properties: Dict[str, Any],
    required: Optional[List[str]] = None,
    description: Optional[str] = None,
) -> Dict[str, Any]:
    """Create an object parameter definition."""
    param = {
        "type": "object",
        "properties": properties,
    }
    if required:
        param["required"] = required
    if description:
        param["description"] = description
    return param


def create_boolean_param(description: str) -> Dict[str, Any]:
    """Create a boolean parameter definition."""
    return {"type": "boolean", "description": description}


def create_integer_param(description: str) -> Dict[str, Any]:
    """Create an integer parameter definition."""
    return {"type": "integer", "description": description}


# Common schemas that can be reused across tools
NODE_ID_PARAM = create_string_param("Unique node ID (e.g., node_0, node_1)")
LABEL_PARAM = create_string_param("Display label for the node")
TAGS_PARAM = create_array_param(
    "Technology tags",
    items={"type": "string"},
)


def create_volume_schema() -> Dict[str, Any]:
    """Create the standard volume mount schema."""
    return create_object_param(
        properties={
            "name": create_string_param("Volume name"),
            "mountPath": create_string_param("Mount path in container"),
        },
        required=["name", "mountPath"],
    )
