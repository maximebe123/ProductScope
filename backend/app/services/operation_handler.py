"""Handler for AI diagram operations - processes tool calls and returns results"""

import json
import logging
from typing import Any, Dict, Optional

from app.models.diagram import (
    GeneratedDiagram,
    GeneratedNode,
    GeneratedEdge,
    DiagramDescription,
    NodeData,
    NodeTypeId,
    VolumeAttachment,
)
from app.models.operations import (
    DiagramContext,
    OperationResponse,
    NodeModification,
    EdgeModification,
    GroupCreation,
)
from app.models.responses import PositionedNode, PositionedEdge, PositionedNodeData
from app.services.layout_engine import layout_engine

logger = logging.getLogger(__name__)

# Mapping for common LLM mistakes when generating nodeType
NODE_TYPE_ALIASES = {
    "postgres": "database", "postgresql": "database", "mysql": "database",
    "mongodb": "database", "dynamodb": "database", "db": "database",
    "sql": "database", "nosql": "database", "cassandra": "database",
    "redis": "cache", "memcached": "cache", "elasticache": "cache",
    "kafka": "queue", "rabbitmq": "queue", "sqs": "queue", "nats": "queue",
    "s3": "storage", "blob": "storage", "gcs": "storage", "minio": "storage",
    "lambda": "function", "serverless": "function", "cloudfunction": "function",
    "ec2": "vm", "gce": "vm",
    "docker": "container", "kubernetes": "container", "k8s": "container", "pod": "container",
    "nginx": "loadbalancer", "haproxy": "loadbalancer", "alb": "loadbalancer",
    "cloudfront": "cdn", "cloudflare": "cdn", "fastly": "cdn",
    "frontend": "webapp", "web": "webapp", "react": "webapp", "vue": "webapp",
    "backend": "microservice", "service": "microservice",
    "authentication": "auth", "oauth": "auth", "keycloak": "auth",
    "waf": "firewall", "secrets": "vault",
    "client": "user", "customer": "user",
    "external": "thirdparty", "third-party": "thirdparty",
    "aws": "cloud", "gcp": "cloud", "azure": "cloud",
}


def normalize_node_type(raw_type: str) -> str:
    """Normalize node type from LLM output to valid NodeTypeId."""
    normalized = raw_type.lower().strip()
    valid_types = {nt.value for nt in NodeTypeId}
    if normalized in valid_types:
        return normalized
    if normalized in NODE_TYPE_ALIASES:
        return NODE_TYPE_ALIASES[normalized]
    logger.warning(f"Unknown node type '{raw_type}', defaulting to 'server'")
    return "server"


class OperationHandler:
    """Handles execution of AI tool calls and returns appropriate responses"""

    def handle_tool_call(
        self,
        tool_name: str,
        arguments: Dict[str, Any],
        context: Optional[DiagramContext] = None
    ) -> OperationResponse:
        """
        Route tool call to appropriate handler.

        Args:
            tool_name: Name of the tool called by AI
            arguments: Parsed arguments from the tool call
            context: Current diagram context (if any)

        Returns:
            OperationResponse with appropriate data for the operation type
        """
        handlers = {
            "generate_diagram": self._handle_generate_diagram,
            "add_nodes": self._handle_add_nodes,
            "modify_nodes": self._handle_modify_nodes,
            "delete_nodes": self._handle_delete_nodes,
            "add_edges": self._handle_add_edges,
            "modify_edges": self._handle_modify_edges,
            "delete_edges": self._handle_delete_edges,
            "create_group": self._handle_create_group,
        }

        handler = handlers.get(tool_name)
        if not handler:
            return OperationResponse(
                success=False,
                operation_type="generate",
                message=f"Unknown tool: {tool_name}"
            )

        try:
            return handler(arguments, context)
        except Exception as e:
            logger.error(f"Error handling tool {tool_name}: {e}", exc_info=True)
            return OperationResponse(
                success=False,
                operation_type="generate",
                message=f"Error executing {tool_name}: {str(e)}"
            )

    def _handle_generate_diagram(
        self,
        args: Dict[str, Any],
        context: Optional[DiagramContext]
    ) -> OperationResponse:
        """Handle generate_diagram tool - full diagram creation"""
        nodes = []
        for i, node_data in enumerate(args.get("nodes", [])):
            is_group = node_data.get("isGroup", False)
            raw_type = node_data.get("nodeType", "server")
            normalized_type = normalize_node_type(raw_type)

            volumes = []
            for vol in node_data.get("volumes", []):
                if isinstance(vol, dict) and "name" in vol and "mountPath" in vol:
                    volumes.append(VolumeAttachment(name=vol["name"], mountPath=vol["mountPath"]))

            nodes.append(
                GeneratedNode(
                    id=node_data.get("id", f"node_{i}"),
                    type="groupNode" if is_group else "customNode",
                    data=NodeData(
                        label=node_data.get("label", "Component"),
                        nodeType=NodeTypeId(normalized_type),
                        tags=node_data.get("tags", []),
                        volumes=volumes,
                        isGroup=is_group,
                    ),
                    logicalLayer=node_data.get("logicalLayer", 3),
                    logicalOrder=node_data.get("logicalOrder", i),
                    parentGroup=node_data.get("parentGroup"),
                )
            )

        edges = []
        for i, edge_data in enumerate(args.get("edges", [])):
            edges.append(
                GeneratedEdge(
                    id=edge_data.get("id", f"edge_{i}"),
                    source=edge_data.get("source", ""),
                    target=edge_data.get("target", ""),
                )
            )

        diagram = GeneratedDiagram(
            description=DiagramDescription(
                title=args.get("title", "Architecture Diagram"),
                summary=args.get("summary", "Generated architecture diagram"),
                components=[n.data.label for n in nodes],
            ),
            nodes=nodes,
            edges=edges,
        )

        # Apply layout
        positioned = layout_engine.apply_layout(diagram)

        # Add edge labels from args
        for i, edge in enumerate(positioned.edges):
            if i < len(args.get("edges", [])):
                edge_args = args["edges"][i]
                if edge_args.get("label"):
                    if edge.data:
                        edge.data.label = edge_args["label"]

        return OperationResponse(
            success=True,
            operation_type="generate",
            diagram=positioned,
            message=f"Created diagram '{args.get('title', 'Architecture')}' with {len(nodes)} components"
        )

    def _handle_add_nodes(
        self,
        args: Dict[str, Any],
        context: Optional[DiagramContext]
    ) -> OperationResponse:
        """Handle add_nodes tool - add new nodes to existing diagram"""
        nodes_to_add = []

        # Calculate base position for new nodes
        base_x = 400
        base_y = 300
        if context and context.nodes:
            # Find rightmost position to add new nodes
            max_x = max(100, 400)  # Default if no positions known

        for i, node_data in enumerate(args.get("nodes", [])):
            is_group = node_data.get("isGroup", False)
            raw_type = node_data.get("nodeType", "server")
            normalized_type = normalize_node_type(raw_type)

            volumes = []
            for vol in node_data.get("volumes", []):
                if isinstance(vol, dict) and "name" in vol and "mountPath" in vol:
                    volumes.append({"name": vol["name"], "mountPath": vol["mountPath"]})

            # Calculate position based on layer
            layer = node_data.get("logicalLayer", 3)
            order = node_data.get("logicalOrder", i)
            x = base_x + (order * 228)  # 180 width + 48 gap
            y = 100 + (layer * 200)  # Layer-based Y

            nodes_to_add.append(
                PositionedNode(
                    id=node_data.get("id", f"new_node_{i}"),
                    type="groupNode" if is_group else "customNode",
                    position={"x": x, "y": y},
                    data=PositionedNodeData(
                        label=node_data.get("label", "Component"),
                        nodeType=normalized_type,
                        tags=node_data.get("tags", []),
                        volumes=volumes,
                        isGroup=is_group,
                    ),
                )
            )

        # Handle edges to connect new nodes
        edges_to_add = []
        for i, edge_data in enumerate(args.get("edges", [])):
            edges_to_add.append(
                PositionedEdge(
                    id=edge_data.get("id", f"new_edge_{i}"),
                    source=edge_data.get("source", ""),
                    target=edge_data.get("target", ""),
                    type="custom",
                    data={"label": edge_data.get("label")} if edge_data.get("label") else None,
                )
            )

        node_labels = [n.data.label for n in nodes_to_add]
        return OperationResponse(
            success=True,
            operation_type="add",
            nodes_to_add=nodes_to_add,
            edges_to_add=edges_to_add,
            message=f"Added {len(nodes_to_add)} component(s): {', '.join(node_labels)}"
        )

    def _handle_modify_nodes(
        self,
        args: Dict[str, Any],
        context: Optional[DiagramContext]
    ) -> OperationResponse:
        """Handle modify_nodes tool - update existing nodes"""
        modifications = []

        # Build ID to label mapping from context
        id_to_label = {}
        if context and context.nodes:
            id_to_label = {n.id: n.label for n in context.nodes}

        for mod_data in args.get("modifications", []):
            volumes = None
            if mod_data.get("add_volumes"):
                volumes = [
                    VolumeAttachment(name=v["name"], mountPath=v["mountPath"])
                    for v in mod_data["add_volumes"]
                    if isinstance(v, dict) and "name" in v and "mountPath" in v
                ]

            modifications.append(
                NodeModification(
                    node_id=mod_data.get("node_id", ""),
                    new_label=mod_data.get("new_label"),
                    new_tags=mod_data.get("new_tags"),
                    add_tags=mod_data.get("add_tags"),
                    remove_tags=mod_data.get("remove_tags"),
                    add_volumes=volumes,
                    new_parent_group=mod_data.get("new_parent_group"),
                )
            )

        # Use labels in summary instead of IDs
        mod_labels = [id_to_label.get(m.node_id, m.node_id) for m in modifications]
        mod_summary = ", ".join(mod_labels) if mod_labels else ""
        return OperationResponse(
            success=True,
            operation_type="modify",
            nodes_to_modify=modifications,
            message=f"Modified {len(modifications)} component(s): {mod_summary}"
        )

    def _handle_delete_nodes(
        self,
        args: Dict[str, Any],
        context: Optional[DiagramContext]
    ) -> OperationResponse:
        """Handle delete_nodes tool - remove nodes"""
        node_ids = args.get("node_ids", [])
        reason = args.get("reason", "User requested removal")

        return OperationResponse(
            success=True,
            operation_type="delete",
            nodes_to_delete=node_ids,
            message=f"Removed {len(node_ids)} component(s): {reason}"
        )

    def _handle_add_edges(
        self,
        args: Dict[str, Any],
        context: Optional[DiagramContext]
    ) -> OperationResponse:
        """Handle add_edges tool - create new connections"""
        edges_to_add = []

        for i, edge_data in enumerate(args.get("edges", [])):
            edges_to_add.append(
                PositionedEdge(
                    id=edge_data.get("id", f"new_edge_{i}"),
                    source=edge_data.get("source", ""),
                    target=edge_data.get("target", ""),
                    type="custom",
                    data={"label": edge_data.get("label")} if edge_data.get("label") else None,
                )
            )

        connections = [f"{e.source} → {e.target}" for e in edges_to_add]
        return OperationResponse(
            success=True,
            operation_type="connect",
            edges_to_add=edges_to_add,
            message=f"Created {len(edges_to_add)} connection(s): {', '.join(connections)}"
        )

    def _handle_modify_edges(
        self,
        args: Dict[str, Any],
        context: Optional[DiagramContext]
    ) -> OperationResponse:
        """Handle modify_edges tool - update existing connections"""
        modifications = []

        # Build ID to label mapping from context
        id_to_label = {}
        if context and context.nodes:
            id_to_label = {n.id: n.label for n in context.nodes}

        # Build edge info for better messages
        edge_info = {}
        if context and context.edges:
            for edge in context.edges:
                src = id_to_label.get(edge.source, edge.source)
                tgt = id_to_label.get(edge.target, edge.target)
                edge_info[edge.id] = f"{src} → {tgt}"

        for mod_data in args.get("modifications", []):
            modifications.append(
                EdgeModification(
                    edge_id=mod_data.get("edge_id", ""),
                    new_label=mod_data.get("new_label"),
                    new_source=mod_data.get("new_source"),
                    new_target=mod_data.get("new_target"),
                )
            )

        # Build human-readable summary
        if len(modifications) <= 3:
            summaries = []
            for m in modifications:
                edge_desc = edge_info.get(m.edge_id, m.edge_id)
                if m.new_label:
                    summaries.append(f"{edge_desc} (label: {m.new_label})")
                else:
                    summaries.append(edge_desc)
            edge_summary = ", ".join(summaries)
        else:
            edge_summary = f"{len(modifications)} connections"

        return OperationResponse(
            success=True,
            operation_type="modify",
            edges_to_modify=modifications,
            message=f"Updated {edge_summary}"
        )

    def _handle_delete_edges(
        self,
        args: Dict[str, Any],
        context: Optional[DiagramContext]
    ) -> OperationResponse:
        """Handle delete_edges tool - remove connections"""
        edge_ids = args.get("edge_ids", [])

        return OperationResponse(
            success=True,
            operation_type="disconnect",
            edges_to_delete=edge_ids,
            message=f"Removed {len(edge_ids)} connection(s)"
        )

    def _handle_create_group(
        self,
        args: Dict[str, Any],
        context: Optional[DiagramContext]
    ) -> OperationResponse:
        """Handle create_group tool - organize nodes into a group"""
        group = GroupCreation(
            group_id=args.get("group_id", "group_0"),
            group_label=args.get("group_label", "Group"),
            group_tags=args.get("group_tags", []),
            node_ids=args.get("node_ids", []),
        )

        return OperationResponse(
            success=True,
            operation_type="group",
            groups_to_create=[group],
            message=f"Created group '{group.group_label}' with {len(group.node_ids)} components"
        )


# Singleton instance
operation_handler = OperationHandler()
