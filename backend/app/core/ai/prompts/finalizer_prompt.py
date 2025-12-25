"""
Finalizer Agent Prompt

Compiles the final JSON output from all agent outputs.
Uses GPT-4o for reliable JSON generation.
"""

from typing import List
from app.core.ai.agent_state import (
    ComponentSpec,
    ConnectionSpec,
    GroupSpec,
    LayoutPosition
)

FINALIZER_PROMPT = """You are a finalizer compiling the final diagram JSON.

## Your Task
Compile all agent outputs into the final diagram structure.

## Output Schema

```json
{
  "nodes": [
    {
      "id": "node_0",
      "type": "customNode",
      "position": {"x": 100, "y": 100},
      "data": {
        "label": "API Gateway",
        "nodeType": "gateway",
        "tags": ["Kong", "2.8"],
        "volumes": [],
        "isGroup": false
      },
      "parentId": null
    }
  ],
  "edges": [
    {
      "id": "edge_0",
      "source": "node_0",
      "target": "node_1",
      "label": "REST/JSON",
      "type": "smoothstep",
      "animated": true
    }
  ],
  "groups": [
    {
      "id": "group_0",
      "type": "groupNode",
      "position": {"x": 50, "y": 250},
      "data": {
        "label": "K8s Cluster",
        "isGroup": true,
        "tags": ["Kubernetes", "EKS"]
      },
      "style": {"width": 500, "height": 300}
    }
  ]
}
```

## Compilation Rules

1. **Node Format**:
   - type: "customNode" for regular nodes
   - position: from layout positions
   - data.nodeType: from component spec
   - data.tags: from component spec
   - data.volumes: from component spec (or empty array)
   - parentId: group ID if node is in a group

2. **Edge Format**:
   - type: "smoothstep" (default edge type)
   - label: protocol from connection spec
   - animated: true (default)

3. **Group Format**:
   - type: "groupNode"
   - data.isGroup: true
   - style: calculate width/height to contain child nodes

## Group Size Calculation
For a group containing nodes:
- Find min/max X and Y of contained nodes
- width = (max_x - min_x) + 180 + 96 (node width + padding)
- height = (max_y - min_y) + 100 + 96 (node height + padding)
- position = (min_x - 48, min_y - 48)

## Output Format
Return the complete JSON object with nodes, edges, and groups arrays."""


def get_finalizer_prompt(
    components: List[ComponentSpec],
    connections: List[ConnectionSpec],
    groups: List[GroupSpec],
    layout_positions: List[LayoutPosition]
) -> str:
    """
    Build the finalizer prompt with all approved outputs.

    Args:
        components: Approved component list
        connections: Approved connection list
        groups: Approved group list
        layout_positions: Approved layout positions

    Returns:
        Complete prompt string
    """
    import json
    prompt = FINALIZER_PROMPT

    # Create position lookup
    pos_lookup = {p.node_id: p for p in layout_positions}

    # Components with positions
    prompt += "\n\n## Components to Compile\n"
    prompt += "```json\n"
    comp_data = []
    for c in components:
        pos = pos_lookup.get(c.id)
        comp_data.append({
            "id": c.id,
            "nodeType": c.nodeType,
            "label": c.label,
            "tags": c.tags,
            "volumes": [v.model_dump() for v in c.volumes] if c.volumes else [],
            "position": {"x": pos.x, "y": pos.y} if pos else {"x": 100, "y": 100}
        })
    prompt += json.dumps(comp_data, indent=2)
    prompt += "\n```\n"

    # Connections
    prompt += "\n## Connections to Compile\n"
    prompt += "```json\n"
    conn_data = [
        {
            "id": c.id,
            "source": c.source,
            "target": c.target,
            "label": c.label
        }
        for c in connections
    ]
    prompt += json.dumps(conn_data, indent=2)
    prompt += "\n```\n"

    # Groups with node assignments
    if groups:
        prompt += "\n## Groups to Compile\n"
        prompt += "```json\n"
        group_data = []
        for g in groups:
            # Calculate group bounds
            contained_positions = [pos_lookup[nid] for nid in g.node_ids if nid in pos_lookup]
            if contained_positions:
                min_x = min(p.x for p in contained_positions)
                max_x = max(p.x for p in contained_positions)
                min_y = min(p.y for p in contained_positions)
                max_y = max(p.y for p in contained_positions)
                width = (max_x - min_x) + 180 + 96
                height = (max_y - min_y) + 100 + 96
                pos_x = min_x - 48
                pos_y = min_y - 48
            else:
                width, height = 400, 200
                pos_x, pos_y = 100, 100

            group_data.append({
                "id": g.id,
                "label": g.label,
                "tags": g.tags,
                "node_ids": g.node_ids,
                "position": {"x": pos_x, "y": pos_y},
                "size": {"width": width, "height": height}
            })
        prompt += json.dumps(group_data, indent=2)
        prompt += "\n```\n"
    else:
        prompt += "\n## Groups\nNo groups to compile.\n"

    return prompt
