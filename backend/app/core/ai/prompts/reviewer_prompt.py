"""
Quality Reviewer Agent Prompt

Reviews the complete output and decides on routing.
Uses GPT-5 for deep quality analysis.
"""

from typing import List, Optional
from app.core.ai.agent_state import (
    ArchitecturePlan,
    ComponentSpec,
    ConnectionSpec,
    GroupSpec,
    LayoutPosition
)

REVIEWER_PROMPT = """You are a quality reviewer checking the architecture diagram output.

## Your Task
Review all agent outputs and decide if the diagram is ready or needs fixes.

## Review Checklist

### 1. Component Completeness
- Are all required components present?
- Do all nodes have specific technology tags (not generic)?
- Are volumes defined for stateful components?
- Is the layer assignment correct?

### 2. Connection Coverage
- Are all connections labeled with protocols?
- Are there orphan nodes (no connections)?
- Do the protocols match the technologies?
- Is the data flow logical?

### 3. Grouping Quality
- Do groups make logical sense?
- Are the right components grouped together?
- Are group names meaningful?

### 4. Layout Quality
- Are nodes properly layered?
- Is there enough spacing?
- Are positions grid-snapped?

## Scoring Guide

| Score | Meaning |
|-------|---------|
| 9-10 | Perfect, no changes needed |
| 8 | Minor issues, acceptable |
| 6-7 | Some issues, needs fixes |
| 4-5 | Significant issues |
| 1-3 | Major problems, restart |

## Decision Matrix

| Score | Decision | Action |
|-------|----------|--------|
| 8+ | approve | Send to Finalizer |
| 6-7 + component issues | fix_components | Back to Component Specialist |
| 6-7 + connection issues | fix_connections | Back to Connection Expert |
| 6-7 + group issues | fix_groups | Back to Grouping Strategist |
| 6-7 + layout issues | fix_layout | Back to Layout Optimizer |
| <6 | restart | Back to Architect |

## Output Format
Return a JSON object with:
- overall_score: 1-10 quality score
- decision: "approve" | "fix_components" | "fix_connections" | "fix_groups" | "fix_layout" | "restart"
- issues: Array of specific issues found
- suggestions: Array of improvements
- target_agent: Which agent should fix (if not approve)

Be thorough but fair. Minor cosmetic issues shouldn't block approval."""


def get_reviewer_prompt(
    architecture_plan: Optional[ArchitecturePlan],
    components: List[ComponentSpec],
    connections: List[ConnectionSpec],
    groups: List[GroupSpec],
    layout_positions: List[LayoutPosition],
    review_iteration: int = 0
) -> str:
    """
    Build the reviewer prompt with all agent outputs.

    Args:
        architecture_plan: Original architecture plan
        components: Component list
        connections: Connection list
        groups: Group list
        layout_positions: Layout positions
        review_iteration: Current review iteration

    Returns:
        Complete prompt string
    """
    import json
    prompt = REVIEWER_PROMPT

    if review_iteration > 0:
        prompt += f"\n\n## Review Iteration {review_iteration + 1}\n"
        prompt += "This is a re-review after fixes. Be more lenient on previously fixed issues.\n"

    # Architecture Plan
    if architecture_plan:
        prompt += "\n\n## Architecture Plan\n"
        prompt += f"- Analysis: {architecture_plan.analysis}\n"
        prompt += f"- Expected nodes: {architecture_plan.estimated_nodes}\n"
        prompt += f"- Expected edges: {architecture_plan.estimated_edges}\n"
        prompt += f"- Complexity: {architecture_plan.complexity_score}/10\n"

    # Components
    prompt += f"\n\n## Components ({len(components)} nodes)\n"
    prompt += "```json\n"
    comp_data = [
        {
            "id": c.id,
            "nodeType": c.nodeType,
            "label": c.label,
            "tags": c.tags,
            "has_volumes": bool(c.volumes),
            "layer": c.suggested_layer
        }
        for c in components
    ]
    prompt += json.dumps(comp_data, indent=2)
    prompt += "\n```\n"

    # Connections
    prompt += f"\n## Connections ({len(connections)} edges)\n"
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

    # Groups
    prompt += f"\n## Groups ({len(groups)} groups)\n"
    if groups:
        prompt += "```json\n"
        group_data = [
            {
                "id": g.id,
                "label": g.label,
                "node_count": len(g.node_ids)
            }
            for g in groups
        ]
        prompt += json.dumps(group_data, indent=2)
        prompt += "\n```\n"
    else:
        prompt += "No groups defined.\n"

    # Layout
    prompt += f"\n## Layout ({len(layout_positions)} positions)\n"
    if layout_positions:
        # Summary by layer
        by_layer = {}
        for pos in layout_positions:
            if pos.layer not in by_layer:
                by_layer[pos.layer] = 0
            by_layer[pos.layer] += 1

        for layer in sorted(by_layer.keys()):
            prompt += f"- Layer {layer}: {by_layer[layer]} nodes\n"
    else:
        prompt += "No positions defined yet.\n"

    # Quick validation hints
    prompt += "\n## Quick Checks\n"

    # Check for generic tags
    generic_tags = ["Database", "Cache", "API", "Service", "Backend", "Frontend"]
    has_generic = any(
        any(tag in generic_tags for tag in c.tags)
        for c in components
    )
    if has_generic:
        prompt += "- WARNING: Some components have generic tags\n"

    # Check for orphan nodes
    connected_nodes = set()
    for conn in connections:
        connected_nodes.add(conn.source)
        connected_nodes.add(conn.target)

    orphans = [c.id for c in components if c.id not in connected_nodes and c.nodeType != "actor"]
    if orphans:
        prompt += f"- WARNING: Orphan nodes found: {', '.join(orphans)}\n"

    # Check for unlabeled edges
    unlabeled = [c.id for c in connections if not c.label]
    if unlabeled:
        prompt += f"- WARNING: Unlabeled edges: {', '.join(unlabeled)}\n"

    return prompt
