"""AI Tools for Mind Map Operations (Simplified xMind style)"""

# Valid mind map node types (simplified to 3)
VALID_NODE_TYPES = [
    "topic",   # Central topic (root) - only one per map
    "branch",  # Main branches and sub-branches
    "note",    # Additional annotations
]

# Tool definitions for OpenAI function calling
GENERATE_MINDMAP_TOOL = {
    "type": "function",
    "function": {
        "name": "generate_mindmap",
        "description": """Generate a complete mind map from a topic or text.

Use this tool ONLY when:
- The mind map is empty AND user wants to create a new mind map
- User explicitly asks to "start over" or "create new mind map"
- User provides a topic/subject to brainstorm

DO NOT use this for adding to existing mind maps.""",
        "parameters": {
            "type": "object",
            "properties": {
                "topic": {
                    "type": "string",
                    "description": "Central topic of the mind map"
                },
                "nodes": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "string"},
                            "label": {"type": "string"},
                            "nodeType": {
                                "type": "string",
                                "enum": VALID_NODE_TYPES
                            }
                        },
                        "required": ["id", "label", "nodeType"]
                    }
                },
                "edges": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "source": {"type": "string"},
                            "target": {"type": "string"}
                        },
                        "required": ["source", "target"]
                    }
                }
            },
            "required": ["topic", "nodes", "edges"]
        }
    }
}

ADD_NODES_TOOL = {
    "type": "function",
    "function": {
        "name": "add_nodes",
        "description": """Add new nodes to the existing mind map.

Use when user wants to:
- Add new branches or ideas
- Extend the mind map
- Add notes to existing branches

Always connect new nodes to existing ones via edges.
Use 'branch' type for ideas and concepts, 'note' for annotations.""",
        "parameters": {
            "type": "object",
            "properties": {
                "nodes": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "string"},
                            "label": {"type": "string"},
                            "nodeType": {
                                "type": "string",
                                "enum": VALID_NODE_TYPES
                            }
                        },
                        "required": ["id", "label", "nodeType"]
                    }
                },
                "edges": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "source": {"type": "string"},
                            "target": {"type": "string"}
                        },
                        "required": ["source", "target"]
                    },
                    "description": "Connections from existing nodes to new nodes"
                }
            },
            "required": ["nodes", "edges"]
        }
    }
}

MODIFY_NODES_TOOL = {
    "type": "function",
    "function": {
        "name": "modify_nodes",
        "description": """Modify existing nodes in the mind map.

Use when user wants to:
- Rename a node
- Change node type (branch <-> note)""",
        "parameters": {
            "type": "object",
            "properties": {
                "modifications": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "string", "description": "Existing node ID"},
                            "label": {"type": "string"},
                            "nodeType": {"type": "string", "enum": VALID_NODE_TYPES}
                        },
                        "required": ["id"]
                    }
                }
            },
            "required": ["modifications"]
        }
    }
}

DELETE_NODES_TOOL = {
    "type": "function",
    "function": {
        "name": "delete_nodes",
        "description": """Delete nodes from the mind map.

Use when user wants to remove branches, notes, or cleanup.
This will also remove connected edges.
Cannot delete the topic (root) node.""",
        "parameters": {
            "type": "object",
            "properties": {
                "node_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "IDs of nodes to delete (cannot include the topic)"
                }
            },
            "required": ["node_ids"]
        }
    }
}

ADD_EDGES_TOOL = {
    "type": "function",
    "function": {
        "name": "add_edges",
        "description": """Create new connections between existing nodes.

Use when user wants to:
- Connect two existing branches
- Create relationships between concepts""",
        "parameters": {
            "type": "object",
            "properties": {
                "edges": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "source": {"type": "string"},
                            "target": {"type": "string"},
                            "label": {"type": "string"}
                        },
                        "required": ["source", "target"]
                    }
                }
            },
            "required": ["edges"]
        }
    }
}

MODIFY_EDGES_TOOL = {
    "type": "function",
    "function": {
        "name": "modify_edges",
        "description": "Update edge labels.",
        "parameters": {
            "type": "object",
            "properties": {
                "modifications": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "string"},
                            "label": {"type": "string"}
                        },
                        "required": ["id"]
                    }
                }
            },
            "required": ["modifications"]
        }
    }
}

DELETE_EDGES_TOOL = {
    "type": "function",
    "function": {
        "name": "delete_edges",
        "description": "Remove connections between nodes.",
        "parameters": {
            "type": "object",
            "properties": {
                "edge_ids": {
                    "type": "array",
                    "items": {"type": "string"}
                }
            },
            "required": ["edge_ids"]
        }
    }
}

EXPAND_BRANCH_TOOL = {
    "type": "function",
    "function": {
        "name": "expand_branch",
        "description": """Auto-generate sub-branches for a specific node.

Use when user says:
- "Expand this branch"
- "Generate ideas for [topic]"
- "What else about [branch]?"
- "Break down [idea]"
- "Give me more details on [node]"
- "Décline [node]" or similar in French

**IMPORTANT**: You MUST generate and provide the nodes array with 3-6 sub-ideas.
Each node should be a relevant sub-topic of the parent branch.

Example: If expanding "Tourisme" for a travel mindmap:
{
  "node_id": "tourism_node_id",
  "nodes": [
    {"id": "t1", "label": "Plages paradisiaques", "nodeType": "branch"},
    {"id": "t2", "label": "Randonnées nature", "nodeType": "branch"},
    {"id": "t3", "label": "Sites historiques", "nodeType": "branch"},
    {"id": "t4", "label": "Réserves naturelles", "nodeType": "branch"}
  ]
}""",
        "parameters": {
            "type": "object",
            "properties": {
                "node_id": {
                    "type": "string",
                    "description": "ID of the node to expand (from context)"
                },
                "nodes": {
                    "type": "array",
                    "description": "REQUIRED: Array of 3-6 sub-ideas to add as children. YOU MUST GENERATE THESE.",
                    "minItems": 3,
                    "maxItems": 8,
                    "items": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "string", "description": "Unique ID for the new node"},
                            "label": {"type": "string", "description": "Label/text for the sub-idea"},
                            "nodeType": {"type": "string", "enum": VALID_NODE_TYPES, "default": "branch"}
                        },
                        "required": ["id", "label", "nodeType"]
                    }
                }
            },
            "required": ["node_id", "nodes"]
        }
    }
}

# All tools for mind map operations (simplified - removed create_group)
ALL_MINDMAP_TOOLS = [
    GENERATE_MINDMAP_TOOL,
    ADD_NODES_TOOL,
    MODIFY_NODES_TOOL,
    DELETE_NODES_TOOL,
    ADD_EDGES_TOOL,
    MODIFY_EDGES_TOOL,
    DELETE_EDGES_TOOL,
    EXPAND_BRANCH_TOOL,
]
