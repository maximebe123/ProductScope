"""Layout engine for positioning generated nodes on the canvas"""

from typing import Dict, List
from app.models.diagram import GeneratedDiagram, GeneratedNode
from app.models.responses import (
    PositionedDiagram,
    PositionedNode,
    PositionedEdge,
    PositionedNodeData,
    PositionedEdgeData,
    Position,
)

# Layout constants matching ProductScope grid
GRID_SIZE = 24  # Grid snapping increment
NODE_WIDTH = 180
NODE_HEIGHT = 80
HORIZONTAL_GAP = 72  # 3 grid units between nodes
VERTICAL_GAP = 120  # 5 grid units between layers
START_X = 100
START_Y = 100


def snap_to_grid(value: int) -> int:
    """Snap a value to the nearest grid position"""
    return round(value / GRID_SIZE) * GRID_SIZE


class LayoutEngine:
    """
    Converts logical layer/order positions to absolute x/y coordinates.
    Uses a layered layout algorithm similar to Sugiyama.
    """

    def apply_layout(self, diagram: GeneratedDiagram) -> PositionedDiagram:
        """
        Apply layout algorithm to a generated diagram.

        Args:
            diagram: The AI-generated diagram with logical positions

        Returns:
            A positioned diagram ready for ProductScope
        """
        # Group nodes by layer
        layers: Dict[int, List[GeneratedNode]] = {}
        for node in diagram.nodes:
            layer = node.logicalLayer
            if layer not in layers:
                layers[layer] = []
            layers[layer].append(node)

        # Sort nodes within each layer by logicalOrder
        for layer in layers:
            layers[layer].sort(key=lambda n: n.logicalOrder)

        # Calculate layer widths for centering
        layer_widths: Dict[int, int] = {}
        max_width = 0
        for layer_idx in sorted(layers.keys()):
            layer_nodes = layers[layer_idx]
            width = (
                len(layer_nodes) * NODE_WIDTH
                + (len(layer_nodes) - 1) * HORIZONTAL_GAP
            )
            layer_widths[layer_idx] = width
            max_width = max(max_width, width)

        # Position nodes
        positioned_nodes: List[PositionedNode] = []
        node_positions: Dict[str, Position] = {}

        current_y = START_Y
        for layer_idx in sorted(layers.keys()):
            layer_nodes = layers[layer_idx]
            layer_width = layer_widths[layer_idx]

            # Center the layer horizontally
            start_x = START_X + (max_width - layer_width) // 2

            current_x = start_x
            for node in layer_nodes:
                # Snap to grid
                snapped_x = snap_to_grid(current_x)
                snapped_y = snap_to_grid(current_y)

                position = Position(x=snapped_x, y=snapped_y)
                node_positions[node.id] = position

                positioned_nodes.append(
                    PositionedNode(
                        id=node.id,
                        type=node.type,
                        position=position,
                        data=PositionedNodeData(
                            label=node.data.label,
                            nodeType=node.data.nodeType.value,
                            tags=node.data.tags or [],
                            volumes=[
                                {"name": v.name, "mountPath": v.mountPath}
                                for v in (node.data.volumes or [])
                            ],
                            isGroup=node.data.isGroup or False,
                        ),
                    )
                )

                current_x += NODE_WIDTH + HORIZONTAL_GAP

            current_y += NODE_HEIGHT + VERTICAL_GAP

        # Optimize edge handles based on node positions
        positioned_edges = self._optimize_edge_handles(
            diagram.edges, node_positions
        )

        return PositionedDiagram(
            version="1.0",
            name=diagram.description.title,
            nodes=positioned_nodes,
            edges=positioned_edges,
        )

    def _optimize_edge_handles(
        self, edges, node_positions: Dict[str, Position]
    ) -> List[PositionedEdge]:
        """
        Assign optimal handle positions based on relative node positions.
        """
        optimized_edges: List[PositionedEdge] = []

        for edge in edges:
            source_pos = node_positions.get(edge.source)
            target_pos = node_positions.get(edge.target)

            source_handle = None
            target_handle = None

            if source_pos and target_pos:
                dx = target_pos.x - source_pos.x
                dy = target_pos.y - source_pos.y

                if abs(dy) > abs(dx):
                    # Primarily vertical connection
                    if dy > 0:
                        source_handle = "bottom"
                        target_handle = "top"
                    else:
                        source_handle = "top"
                        target_handle = "bottom"
                else:
                    # Primarily horizontal connection
                    if dx > 0:
                        source_handle = "right"
                        target_handle = "left"
                    else:
                        source_handle = "left"
                        target_handle = "right"

            edge_data = None
            if edge.data:
                edge_data = PositionedEdgeData(
                    label=edge.data.label,
                    colorFromTarget=edge.data.colorFromTarget or False,
                )

            optimized_edges.append(
                PositionedEdge(
                    id=edge.id,
                    source=edge.source,
                    target=edge.target,
                    type="custom",
                    sourceHandle=source_handle,
                    targetHandle=target_handle,
                    data=edge_data,
                )
            )

        return optimized_edges


# Singleton instance
layout_engine = LayoutEngine()
