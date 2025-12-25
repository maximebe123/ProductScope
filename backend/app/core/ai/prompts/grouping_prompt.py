"""
Grouping Strategist Agent Prompt

Creates logical groups for related components.
Uses GPT-5-mini for fast grouping decisions.
"""

from typing import List
from app.core.ai.agent_state import ComponentSpec, ArchitecturePlan

GROUPING_PROMPT = """You are a grouping strategist organizing architecture components.

## Your Task
Create logical groups to organize related components visually.

## Group Types

### Infrastructure Groups
| Type | Use For | Example Tags |
|------|---------|--------------|
| Kubernetes Cluster | Pods, services in K8s | ["Kubernetes", "EKS"] |
| AWS VPC | Components in same network | ["AWS", "VPC", "10.0.0.0/16"] |
| Azure Resource Group | Azure resources | ["Azure", "Resource Group"] |
| GCP Project | GCP services | ["GCP", "Project"] |

### Logical Groups
| Type | Use For | Example Tags |
|------|---------|--------------|
| Microservice Domain | Services by business domain | ["Domain", "Users"] |
| Security Zone | DMZ, private, database tiers | ["Security", "Private"] |
| Data Layer | All data stores together | ["Data", "Persistence"] |
| Integration Layer | Gateways and proxies | ["Integration"] |

## Grouping Guidelines

1. **Group by deployment**: Components deployed together
2. **Group by domain**: Business domain boundaries
3. **Group by security**: Security zone boundaries
4. **Group by layer**: Infrastructure layers (optional)

## CRITICAL RULES

1. **Only create groups if they add value** - not every diagram needs groups
2. **Don't over-group** - 2-4 groups max for most diagrams
3. **Meaningful names** - "User Service Cluster" not "Group 1"
4. **No nested groups** - keep it flat

## When to Skip Groups
- Simple diagrams with < 5 nodes
- No clear domain boundaries
- All components in same deployment

## Output Format
Return a JSON array of groups (can be empty if no groups needed).
Each group must have:
- id: Unique group ID (group_0, group_1, etc.)
- label: Display name
- tags: Group tags
- node_ids: Array of node IDs to include
- rationale: Why this grouping was created"""


def get_grouping_prompt(
    components: List[ComponentSpec],
    architecture_plan: ArchitecturePlan
) -> str:
    """
    Build the grouping prompt with components and plan.

    Args:
        components: List of components from Component Specialist
        architecture_plan: Architecture plan from Architect

    Returns:
        Complete prompt string
    """
    prompt = GROUPING_PROMPT

    prompt += "\n\n## Architecture Context\n"
    prompt += f"**Patterns**: {', '.join(architecture_plan.suggested_patterns)}\n"
    prompt += f"**Complexity**: {architecture_plan.complexity_score}/10\n"

    if architecture_plan.special_requirements:
        prompt += f"**Requirements**: {', '.join(architecture_plan.special_requirements)}\n"

    prompt += "\n## Components to Organize\n"
    prompt += "```json\n"

    # Format components by layer
    import json
    by_layer = {}
    for comp in components:
        layer = comp.suggested_layer
        if layer not in by_layer:
            by_layer[layer] = []
        by_layer[layer].append({
            "id": comp.id,
            "nodeType": comp.nodeType,
            "label": comp.label,
            "layer": layer
        })

    for layer in sorted(by_layer.keys()):
        prompt += f"\n// Layer {layer}\n"
        prompt += json.dumps(by_layer[layer], indent=2)

    prompt += "\n```\n"

    # Grouping suggestions based on patterns
    prompt += "\n## Suggested Groupings\n"
    patterns = architecture_plan.suggested_patterns

    if "microservices" in [p.lower() for p in patterns]:
        prompt += "- Consider grouping by microservice domain\n"
    if "kubernetes" in [p.lower() for p in patterns] or any("k8s" in p.lower() for p in patterns):
        prompt += "- Consider a Kubernetes cluster group\n"
    if len(components) > 8:
        prompt += "- With many components, grouping helps organization\n"
    if len(components) <= 5:
        prompt += "- With few components, groups may not be necessary\n"

    return prompt
