"""AI Tools for Flowchart Operations (Mermaid.js)"""

# Valid flowchart node types
VALID_NODE_TYPES = [
    # Basic shapes
    "start_end",        # ([Label]) - Stadium shape
    "process",          # [Label] - Rectangle
    "decision",         # {Label} - Diamond
    "data",             # [/Label/] - Parallelogram
    "database",         # [(Label)] - Cylinder
    # Geometric shapes
    "hexagon",          # {{Label}} - Hexagon
    "trapezoid",        # [/Label\] - Trapezoid
    "trapezoid_alt",    # [\Label/] - Inverted trapezoid
    "parallelogram_alt",# [\Label\] - Alt parallelogram
    "double_circle",    # (((Label))) - Double circle
    "asymmetric",       # >Label] - Flag/banner
    "display",          # @{ shape: curv-trap } - Display
    # Documents
    "document",         # @{ shape: doc } - Document
    "documents",        # @{ shape: docs } - Multiple documents
    "lined_doc",        # @{ shape: lin-doc } - Lined document
    "manual_file",      # @{ shape: manual-file } - File handling
    "card",             # @{ shape: card } - Punched card
    "paper_tape",       # @{ shape: paper-tape } - Paper tape
    # Control flow
    "subprocess",       # [[Label]] - Subroutine
    "connector",        # ((Label)) - Circle
    "parallel",         # @{ shape: fork } - Fork/Join
    "loop",             # @{ shape: lean-r } - Loop
    "junction",         # @{ shape: f-circ } - Junction
    "cross",            # @{ shape: cross } - Cross
    # Advanced
    "comment",          # @{ shape: braces } - Comment
    "error",            # @{ shape: bolt } - Error
    "timer",            # @{ shape: hourglass } - Timer
    "manual",           # @{ shape: trap-t } - Manual operation
    "delay",            # @{ shape: delay } - Delay
    "processes",        # @{ shape: processes } - Multi-process
    "disk_storage",     # @{ shape: lin-cyl } - Disk storage
    "manual_input",     # @{ shape: manual-input } - Manual input
]

# Valid flowchart directions
VALID_DIRECTIONS = ["TB", "TD", "BT", "LR", "RL"]

# Tool definitions for OpenAI function calling
GENERATE_FLOWCHART_TOOL = {
    "type": "function",
    "function": {
        "name": "generate_flowchart",
        "description": """Generate a complete Mermaid.js flowchart from a description.

Use this tool ONLY when:
- The flowchart is empty AND user wants to create a new flowchart
- User explicitly asks to "start over" or "create new flowchart"
- User provides a process/workflow to diagram

DO NOT use this for modifying existing flowcharts.""",
        "parameters": {
            "type": "object",
            "properties": {
                "title": {
                    "type": "string",
                    "description": "Title/description of the flowchart"
                },
                "direction": {
                    "type": "string",
                    "enum": VALID_DIRECTIONS,
                    "description": "Flow direction: TB (top-bottom), LR (left-right), etc.",
                    "default": "TB"
                },
                "mermaid_code": {
                    "type": "string",
                    "description": """Complete Mermaid flowchart code. Use proper syntax:
- Start with 'flowchart TB' (or other direction)
- Node shapes: ([Start]) for start/end, [Process] for process, {Decision} for decision
- Edges: A --> B, A -->|label| B
- Subgraphs: subgraph "Name"...end

IMPORTANT: Node labels must NOT contain parentheses () as they break Mermaid syntax.
Use alternatives like brackets [] or dashes - instead.

Example:
flowchart TB
    A([Start]) --> B[Process Data]
    B --> C{Valid?}
    C -->|Yes| D[Save]
    C -->|No| E[Error]
    D --> F([End])
    E --> B"""
                }
            },
            "required": ["title", "mermaid_code"]
        }
    }
}

ADD_NODES_TOOL = {
    "type": "function",
    "function": {
        "name": "add_nodes",
        "description": """Add new nodes and edges to the existing flowchart.

Use when user wants to:
- Add new steps to the flow
- Extend the flowchart
- Add decision branches

Returns Mermaid code lines to append to the existing flowchart.""",
        "parameters": {
            "type": "object",
            "properties": {
                "mermaid_lines": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": """Lines of Mermaid code to add. Each line should be a valid node definition or edge.
IMPORTANT: Node labels must NOT contain parentheses () as they break Mermaid syntax.
Examples:
- "    D[New Process]"
- "    C --> D"
- "    D -->|success| E([End])"
"""
                },
                "connect_from": {
                    "type": "string",
                    "description": "ID of existing node to connect the new nodes from"
                }
            },
            "required": ["mermaid_lines"]
        }
    }
}

MODIFY_FLOWCHART_TOOL = {
    "type": "function",
    "function": {
        "name": "modify_flowchart",
        "description": """Modify the existing flowchart by providing the complete updated Mermaid code.

Use when user wants to:
- Rename nodes/labels
- Change node types
- Reorganize the flow
- Update edge labels
- Complex modifications that affect multiple elements

This replaces the entire flowchart code.""",
        "parameters": {
            "type": "object",
            "properties": {
                "mermaid_code": {
                    "type": "string",
                    "description": "Complete updated Mermaid flowchart code. IMPORTANT: Node labels must NOT contain parentheses () as they break Mermaid syntax."
                },
                "changes_summary": {
                    "type": "string",
                    "description": "Brief description of what was changed"
                }
            },
            "required": ["mermaid_code", "changes_summary"]
        }
    }
}

DELETE_ELEMENTS_TOOL = {
    "type": "function",
    "function": {
        "name": "delete_elements",
        "description": """Delete nodes or edges from the flowchart.

Use when user wants to:
- Remove specific nodes
- Remove connections
- Simplify the flowchart

Returns the updated Mermaid code without the deleted elements.""",
        "parameters": {
            "type": "object",
            "properties": {
                "mermaid_code": {
                    "type": "string",
                    "description": "Complete updated Mermaid code with elements removed. IMPORTANT: Node labels must NOT contain parentheses ()."
                },
                "deleted_elements": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of node IDs or edge descriptions that were deleted"
                }
            },
            "required": ["mermaid_code", "deleted_elements"]
        }
    }
}

CREATE_SUBGRAPH_TOOL = {
    "type": "function",
    "function": {
        "name": "create_subgraph",
        "description": """Create a subgraph (swimlane) to group related nodes.

Use when user wants to:
- Create swimlanes
- Group related processes
- Add organizational structure

Returns the complete updated Mermaid code with the new subgraph.""",
        "parameters": {
            "type": "object",
            "properties": {
                "mermaid_code": {
                    "type": "string",
                    "description": """Complete Mermaid code with the new subgraph.
IMPORTANT: Node labels must NOT contain parentheses () as they break Mermaid syntax.
Example:
flowchart TB
    subgraph "User Actions"
        A([Start]) --> B[Submit]
    end
    subgraph "Processing"
        B --> C{Valid?}
        C -->|Yes| D[Process]
    end"""
                },
                "subgraph_name": {
                    "type": "string",
                    "description": "Name of the new subgraph"
                },
                "node_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "IDs of nodes included in the subgraph"
                }
            },
            "required": ["mermaid_code", "subgraph_name"]
        }
    }
}

EXPAND_NODE_TOOL = {
    "type": "function",
    "function": {
        "name": "expand_node",
        "description": """Expand a single node into a detailed sub-flow.

Use when user wants to:
- Break down a process into steps
- Add detail to a specific node
- Expand a high-level step

Returns complete Mermaid code with the node expanded into multiple steps.""",
        "parameters": {
            "type": "object",
            "properties": {
                "node_id": {
                    "type": "string",
                    "description": "ID of the node to expand"
                },
                "mermaid_code": {
                    "type": "string",
                    "description": "Complete updated Mermaid code with the node expanded into sub-steps. IMPORTANT: Node labels must NOT contain parentheses ()."
                },
                "expansion_summary": {
                    "type": "string",
                    "description": "Brief description of how the node was expanded"
                }
            },
            "required": ["node_id", "mermaid_code", "expansion_summary"]
        }
    }
}

CHANGE_DIRECTION_TOOL = {
    "type": "function",
    "function": {
        "name": "change_direction",
        "description": """Change the flow direction of the flowchart.

Directions:
- TB/TD: Top to Bottom (default)
- BT: Bottom to Top
- LR: Left to Right
- RL: Right to Left""",
        "parameters": {
            "type": "object",
            "properties": {
                "direction": {
                    "type": "string",
                    "enum": VALID_DIRECTIONS,
                    "description": "New flow direction"
                },
                "mermaid_code": {
                    "type": "string",
                    "description": "Updated Mermaid code with new direction. IMPORTANT: Node labels must NOT contain parentheses ()."
                }
            },
            "required": ["direction", "mermaid_code"]
        }
    }
}

APPLY_STYLE_TOOL = {
    "type": "function",
    "function": {
        "name": "apply_style",
        "description": """Apply visual styles to nodes, edges, or create class definitions.

Use when user wants to:
- Change colors of specific nodes (fill, stroke, text)
- Create a consistent color scheme or theme
- Highlight certain nodes or paths
- Style edges/links with colors
- Create reusable style classes

Supports Mermaid style and classDef syntax.""",
        "parameters": {
            "type": "object",
            "properties": {
                "mermaid_code": {
                    "type": "string",
                    "description": """Complete updated Mermaid code with styles applied.

Styling syntax:
- Node style: style A fill:#f9f,stroke:#333,stroke-width:4px
- Multiple nodes: style A,B,C fill:#f9f
- Class definition: classDef className fill:#f9f,stroke:#333
- Apply class: class A,B className
- Inline class: A:::className
- Link style: linkStyle 0 stroke:#ff0000
- Default link: linkStyle default stroke:#333

Example:
flowchart TB
    A([Start]) --> B[Process]
    B --> C{Decision}
    classDef highlight fill:#ffcf00,stroke:#0230a8
    class B highlight
    style A fill:#e8eeff,stroke:#0230a8
    linkStyle 0 stroke:#0230a8,stroke-width:2px"""
                },
                "style_summary": {
                    "type": "string",
                    "description": "Brief description of styles applied"
                }
            },
            "required": ["mermaid_code", "style_summary"]
        }
    }
}

# All tools for flowchart operations
ALL_FLOWCHART_TOOLS = [
    GENERATE_FLOWCHART_TOOL,
    ADD_NODES_TOOL,
    MODIFY_FLOWCHART_TOOL,
    DELETE_ELEMENTS_TOOL,
    CREATE_SUBGRAPH_TOOL,
    EXPAND_NODE_TOOL,
    CHANGE_DIRECTION_TOOL,
    APPLY_STYLE_TOOL,
]
