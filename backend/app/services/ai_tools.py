"""AI Tool definitions for diagram operations"""

from app.models.diagram import NodeTypeId

# All valid node types for enum constraint
NODE_TYPES_ENUM = [nt.value for nt in NodeTypeId]

# =============================================================================
# TOOL 1: Generate Complete Diagram (existing, enhanced)
# =============================================================================
GENERATE_DIAGRAM_TOOL = {
    "name": "generate_diagram",
    "description": """Generate a complete new architecture diagram from scratch.

Use this ONLY when:
- The context shows NO existing nodes (empty canvas)
- User explicitly says "start over", "new diagram", "from scratch", "create a new"
- User describes an entirely new architecture without any reference to existing components

**CRITICAL: DO NOT use this tool if the context shows existing nodes!**
**If there are existing nodes, use add_nodes, modify_nodes, modify_edges instead.**
**This tool REPLACES the entire diagram - only use for fresh starts!**""",
    "parameters": {
        "type": "object",
        "properties": {
            "title": {
                "type": "string",
                "description": "Short title for the diagram (2-5 words)"
            },
            "summary": {
                "type": "string",
                "description": "Brief summary of the architecture (1-2 sentences)"
            },
            "nodes": {
                "type": "array",
                "description": "All nodes in the diagram",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string", "description": "Unique ID (node_0, node_1, etc.)"},
                        "nodeType": {"type": "string", "enum": NODE_TYPES_ENUM},
                        "label": {"type": "string", "description": "Display name"},
                        "tags": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Technology tags (PostgreSQL, Redis, React, etc.)"
                        },
                        "volumes": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "name": {"type": "string"},
                                    "mountPath": {"type": "string"}
                                },
                                "required": ["name", "mountPath"]
                            },
                            "description": "Volume mounts for containers/databases"
                        },
                        "isGroup": {"type": "boolean", "description": "True if this is a group container"},
                        "parentGroup": {"type": "string", "description": "Parent group ID if nested"},
                        "logicalLayer": {"type": "integer", "description": "Layer 0-5 for positioning"},
                        "logicalOrder": {"type": "integer", "description": "Order within layer"}
                    },
                    "required": ["id", "nodeType", "label", "logicalLayer", "logicalOrder"]
                }
            },
            "edges": {
                "type": "array",
                "description": "Connections between nodes",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string", "description": "Unique ID (edge_0, edge_1, etc.)"},
                        "source": {"type": "string", "description": "Source node ID"},
                        "target": {"type": "string", "description": "Target node ID"},
                        "label": {"type": "string", "description": "Protocol label (REST, gRPC, WebSocket, etc.)"}
                    },
                    "required": ["id", "source", "target"]
                }
            }
        },
        "required": ["title", "summary", "nodes", "edges"]
    }
}

# =============================================================================
# TOOL 2: Add Nodes
# =============================================================================
ADD_NODES_TOOL = {
    "name": "add_nodes",
    "description": """Add new components to the existing diagram.

Use when user says:
- "Add a cache" / "Add Redis"
- "Include a load balancer"
- "I need authentication"
- "Put a database"

The new nodes will be positioned and connected to existing components.""",
    "parameters": {
        "type": "object",
        "properties": {
            "nodes": {
                "type": "array",
                "description": "New nodes to add",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string", "description": "Unique ID (use new_node_0, new_node_1, etc.)"},
                        "nodeType": {"type": "string", "enum": NODE_TYPES_ENUM},
                        "label": {"type": "string"},
                        "tags": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Technology tags - ALWAYS include specific tech (Redis, PostgreSQL, etc.)"
                        },
                        "volumes": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "name": {"type": "string"},
                                    "mountPath": {"type": "string"}
                                }
                            }
                        },
                        "isGroup": {"type": "boolean"},
                        "parentGroup": {"type": "string", "description": "Existing group ID to add this node into"},
                        "logicalLayer": {"type": "integer"},
                        "logicalOrder": {"type": "integer"}
                    },
                    "required": ["id", "nodeType", "label"]
                }
            },
            "edges": {
                "type": "array",
                "description": "Connections between new and existing nodes",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"},
                        "source": {"type": "string", "description": "Can be new or existing node ID"},
                        "target": {"type": "string", "description": "Can be new or existing node ID"},
                        "label": {"type": "string", "description": "Protocol (REST, gRPC, TCP, etc.)"}
                    },
                    "required": ["id", "source", "target"]
                }
            }
        },
        "required": ["nodes"]
    }
}

# =============================================================================
# TOOL 3: Modify Nodes
# =============================================================================
MODIFY_NODES_TOOL = {
    "name": "modify_nodes",
    "description": """Update properties of existing nodes in the diagram.

Use when user says:
- "Rename the database to UserDB"
- "Add PostgreSQL tag to the database"
- "Change the API label"
- "Add a volume mount to the container"
- "Move this node into the K8s cluster group"

Reference nodes by their existing IDs shown in the context.""",
    "parameters": {
        "type": "object",
        "properties": {
            "modifications": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "node_id": {"type": "string", "description": "ID of existing node to modify"},
                        "new_label": {"type": "string", "description": "New display name"},
                        "new_tags": {"type": "array", "items": {"type": "string"}, "description": "Replace all tags"},
                        "add_tags": {"type": "array", "items": {"type": "string"}, "description": "Add to existing tags"},
                        "remove_tags": {"type": "array", "items": {"type": "string"}, "description": "Remove from tags"},
                        "add_volumes": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "name": {"type": "string"},
                                    "mountPath": {"type": "string"}
                                }
                            }
                        },
                        "new_parent_group": {"type": "string", "description": "Move into a different group"}
                    },
                    "required": ["node_id"]
                }
            }
        },
        "required": ["modifications"]
    }
}

# =============================================================================
# TOOL 4: Delete Nodes
# =============================================================================
DELETE_NODES_TOOL = {
    "name": "delete_nodes",
    "description": """Remove nodes from the diagram. Associated edges are automatically removed.

Use when user says:
- "Remove the cache"
- "Delete the monitoring components"
- "Get rid of the CDN"
- "I don't need the firewall anymore"

Reference nodes by their existing IDs shown in the context.""",
    "parameters": {
        "type": "object",
        "properties": {
            "node_ids": {
                "type": "array",
                "items": {"type": "string"},
                "description": "IDs of nodes to delete"
            },
            "reason": {
                "type": "string",
                "description": "Brief explanation of what was removed"
            }
        },
        "required": ["node_ids"]
    }
}

# =============================================================================
# TOOL 5: Add Edges
# =============================================================================
ADD_EDGES_TOOL = {
    "name": "add_edges",
    "description": """Create new connections between existing nodes.

Use when user says:
- "Connect the API to the database"
- "Link the frontend to the gateway"
- "Add a connection from auth to the microservice"
- "The cache should connect to the database"

Reference nodes by their existing IDs shown in the context.""",
    "parameters": {
        "type": "object",
        "properties": {
            "edges": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string", "description": "Unique edge ID (new_edge_0, etc.)"},
                        "source": {"type": "string", "description": "Source node ID"},
                        "target": {"type": "string", "description": "Target node ID"},
                        "label": {
                            "type": "string",
                            "description": "Protocol/connection type: REST, gRPC, WebSocket, TCP, AMQP, PostgreSQL, Redis, etc."
                        }
                    },
                    "required": ["id", "source", "target"]
                }
            }
        },
        "required": ["edges"]
    }
}

# =============================================================================
# TOOL 6: Modify Edges
# =============================================================================
MODIFY_EDGES_TOOL = {
    "name": "modify_edges",
    "description": """Update properties of existing connections. Use this to ADD LABELS to edges!

Use when user says:
- "Label the connection as gRPC"
- "Change the protocol to WebSocket"
- "Update the edge label to REST/JSON"
- "Reconnect the API to the new database"
- "Add traffic type to links" / "Add protocol labels"
- "Annotate the connections" / "Specify protocols"
- "Add labels to all edges" / "Label the edges"

**This is the tool to use when adding labels/protocols to existing connections!**
Reference edges by their existing IDs shown in the context.""",
    "parameters": {
        "type": "object",
        "properties": {
            "modifications": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "edge_id": {"type": "string", "description": "ID of existing edge"},
                        "new_label": {"type": "string", "description": "New protocol label"},
                        "new_source": {"type": "string", "description": "Change source node"},
                        "new_target": {"type": "string", "description": "Change target node"}
                    },
                    "required": ["edge_id"]
                }
            }
        },
        "required": ["modifications"]
    }
}

# =============================================================================
# TOOL 7: Delete Edges
# =============================================================================
DELETE_EDGES_TOOL = {
    "name": "delete_edges",
    "description": """Remove connections between nodes.

Use when user says:
- "Remove the connection between API and database"
- "Disconnect the frontend from the cache"
- "Delete the link to the monitoring"

Reference edges by their IDs or describe by source/target nodes.""",
    "parameters": {
        "type": "object",
        "properties": {
            "edge_ids": {
                "type": "array",
                "items": {"type": "string"},
                "description": "IDs of edges to delete"
            }
        },
        "required": ["edge_ids"]
    }
}

# =============================================================================
# TOOL 8: Create Group
# =============================================================================
CREATE_GROUP_TOOL = {
    "name": "create_group",
    "description": """Group existing nodes into a logical container.

Use when user says:
- "Group these into a Kubernetes cluster"
- "Create a VPC boundary around these"
- "Put these services in a microservice domain"
- "Organize these into a security zone"

Groups help visually organize related components.""",
    "parameters": {
        "type": "object",
        "properties": {
            "group_id": {"type": "string", "description": "Unique ID for the group (group_0, etc.)"},
            "group_label": {"type": "string", "description": "Display name (K8s Cluster, AWS VPC, etc.)"},
            "group_tags": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Tags for the group (EKS, AWS, Production, etc.)"
            },
            "node_ids": {
                "type": "array",
                "items": {"type": "string"},
                "description": "IDs of existing nodes to include in the group"
            }
        },
        "required": ["group_id", "group_label", "node_ids"]
    }
}

# =============================================================================
# ALL TOOLS COLLECTION
# =============================================================================

# Base tool definitions (name, description, parameters only)
_BASE_TOOLS = [
    GENERATE_DIAGRAM_TOOL,
    ADD_NODES_TOOL,
    MODIFY_NODES_TOOL,
    DELETE_NODES_TOOL,
    ADD_EDGES_TOOL,
    MODIFY_EDGES_TOOL,
    DELETE_EDGES_TOOL,
    CREATE_GROUP_TOOL,
]

# Tools formatted for OpenAI Chat Completions API
# Format: {"type": "function", "function": {"name": ..., "description": ..., "parameters": ...}}
ALL_TOOLS = [{"type": "function", "function": tool} for tool in _BASE_TOOLS]

# Tools formatted for OpenAI Realtime API
# Format: {"type": "function", "name": ..., "description": ..., "parameters": ...}
ALL_TOOLS_REALTIME = [{"type": "function", **tool} for tool in _BASE_TOOLS]

# Tool names for validation
TOOL_NAMES = [tool["name"] for tool in _BASE_TOOLS]
