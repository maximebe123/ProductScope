"""
Layout Optimizer Agent Prompt

Positions nodes using layer-based layout.
Uses GPT-4o for reliable numerical calculations.
"""

from typing import List
from app.core.ai.agent_state import ComponentSpec, GroupSpec

LAYOUT_PROMPT = """You are a layout optimizer positioning nodes on a diagram canvas.

## Your Task
Calculate optimal positions for all nodes based on their layers.

## Layout Rules

### Layer Positions (Top to Bottom)
| Layer | Components | Y Start |
|-------|------------|---------|
| 0 | External: actors, partners, cloud | 100 |
| 1 | Frontend: webapp, mobile, cdn | 300 |
| 2 | Integration: gateway, loadbalancer, waf | 500 |
| 3 | Services: api, backend, function, worker | 700 |
| 4 | Data/Messaging: sql, cache, queue, stream | 900 |
| 5 | Observability: logging, metrics, tracing | 1100 |

### Grid Settings
- **Grid size**: 24px (all positions snap to grid)
- **Node width**: 180px
- **Horizontal gap**: 72px between nodes
- **Vertical gap**: 120px between layers
- **Start X**: 100px from left edge

### Positioning Algorithm
1. Group nodes by layer
2. For each layer:
   - Count nodes in layer
   - Calculate total width: (node_count * 180) + ((node_count - 1) * 72)
   - Center X: (canvas_width - total_width) / 2
   - Assign X positions left to right

### Example Calculation
For 3 nodes in layer 2:
- Total width: (3 * 180) + (2 * 72) = 684px
- Assuming 1200px canvas: start_x = (1200 - 684) / 2 = 258px
- Node 1: x=264 (snapped to grid)
- Node 2: x=264 + 180 + 72 = 516 -> 528 (snapped)
- Node 3: x=528 + 180 + 72 = 780 -> 792 (snapped)

### Grid Snapping Formula
```
snapped_x = round(x / 24) * 24
snapped_y = round(y / 24) * 24
```

## Group Handling
If a node is in a group:
- Groups are positioned as containers
- Nodes inside groups are positioned relative to group
- Add 48px padding inside groups

## CRITICAL RULES

1. **Snap to grid**: All positions must be multiples of 24
2. **No overlap**: Nodes must not overlap (min 72px horizontal gap)
3. **Layer order**: Respect the layer assignments
4. **Center alignment**: Center each layer horizontally

## Output Format - CRITICAL

You MUST return a JSON object with a "positions" key containing an array.
Do NOT use "nodes", "diagram", "layout", or any other key name.

### Required JSON Structure:
```json
{
  "positions": [
    {"node_id": "node_0", "layer": 0, "order": 0, "x": 264, "y": 100},
    {"node_id": "node_1", "layer": 1, "order": 0, "x": 264, "y": 300},
    {"node_id": "node_2", "layer": 1, "order": 1, "x": 528, "y": 300}
  ]
}
```

### Each position object must have:
- node_id: String - The exact node ID from the input (e.g., "node_0")
- layer: Integer (0-5) - The layer number
- order: Integer - Position within layer (0 = leftmost)
- x: Integer - X coordinate (MUST be multiple of 24)
- y: Integer - Y coordinate (MUST be multiple of 24)

⚠️ IMPORTANT: The root key MUST be "positions", not "nodes" or anything else."""


def get_layout_prompt(
    components: List[ComponentSpec],
    groups: List[GroupSpec]
) -> str:
    """
    Build the layout prompt with components and groups.

    Args:
        components: List of components to position
        groups: List of groups (for container sizing)

    Returns:
        Complete prompt string
    """
    prompt = LAYOUT_PROMPT

    prompt += "\n\n## Nodes to Position\n"

    # Organize by layer
    by_layer = {}
    for comp in components:
        layer = comp.suggested_layer
        if layer not in by_layer:
            by_layer[layer] = []
        by_layer[layer].append({
            "id": comp.id,
            "label": comp.label,
            "nodeType": comp.nodeType
        })

    import json
    for layer in sorted(by_layer.keys()):
        nodes = by_layer[layer]
        prompt += f"\n### Layer {layer} ({len(nodes)} nodes)\n"
        prompt += json.dumps(nodes, indent=2)
        prompt += "\n"

    # Add group info if any
    if groups:
        prompt += "\n## Groups\n"
        for group in groups:
            prompt += f"- **{group.label}** (id: {group.id}): contains {len(group.node_ids)} nodes\n"
            prompt += f"  Node IDs: {', '.join(group.node_ids)}\n"

    # Calculate hints
    total_nodes = len(components)
    max_per_layer = max(len(nodes) for nodes in by_layer.values()) if by_layer else 1

    prompt += f"\n## Layout Hints\n"
    prompt += f"- Total nodes: {total_nodes}\n"
    prompt += f"- Max nodes in one layer: {max_per_layer}\n"
    prompt += f"- Suggested canvas width: {max(1200, max_per_layer * 252 + 200)}px\n"

    # Reinforce the output format
    prompt += f"\n## REMINDER\n"
    prompt += f"Return exactly {total_nodes} positions in a JSON object with key \"positions\".\n"
    prompt += f"Example: {{\"positions\": [{{\"node_id\": \"node_0\", \"layer\": 0, \"order\": 0, \"x\": 264, \"y\": 100}}, ...]}}\n"

    return prompt
