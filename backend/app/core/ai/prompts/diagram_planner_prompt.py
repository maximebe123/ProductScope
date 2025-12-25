"""
Diagram Planner Agent Prompt

Plans which diagrams to generate based on code analysis.
Uses GPT-5-mini for fast planning decisions.
"""

from typing import Dict, Any


DIAGRAM_PLANNER_PROMPT = """You are a technical documentation expert planning diagrams for a software project.

## Your Task
Based on the code analysis provided, plan which diagrams would be most valuable for understanding and documenting this codebase.

## Available Diagram Types

### 1. Architecture Diagram (type: "architecture")
Best for showing:
- System components and their relationships
- External integrations and APIs
- Data stores and caches
- Service boundaries

### 2. Flowchart (type: "flowchart")
Best for showing:
- Business processes step by step
- Decision logic and branches
- User journeys
- API request flows

### 3. Mind Map (type: "mindmap")
Best for showing:
- Feature hierarchy
- Module organization
- Concept relationships
- Documentation structure

## Planning Guidelines

1. **ALWAYS start with 1 architecture diagram**: System overview with all components
2. **Create 1 flowchart per business process/flow detected**:
   - Authentication flow (login, register, password reset, OAuth)
   - CRUD operations for main entities (user management, orders, products...)
   - Payment/checkout flows
   - Data processing pipelines
   - Background job workflows
   - Any API endpoint flow that involves multiple steps
3. **Be comprehensive with flowcharts**: Create as many as needed to document all logical flows
4. **Each flowchart should cover ONE specific process** - don't combine multiple flows

## Output Format

Return a JSON object with a "diagrams" array:

```json
{
  "diagrams": [
    {
      "type": "architecture",
      "title": "System Architecture Overview",
      "description": "High-level view of all components and their interactions",
      "priority": 1,
      "components_to_include": ["Frontend", "API Gateway", "Services", "Databases"],
      "generation_prompt": "Create an architecture diagram showing a React frontend connecting to a FastAPI backend with PostgreSQL database and Redis cache. Include external integrations with Stripe for payments."
    },
    {
      "type": "flowchart",
      "title": "User Authentication Flow",
      "description": "Login and registration process with OAuth support",
      "priority": 2,
      "components_to_include": ["User", "Frontend", "Auth Service", "Database"],
      "generation_prompt": "Create a flowchart showing user authentication: 1) User enters credentials 2) Frontend sends to API 3) API validates 4) JWT generated 5) Token returned. Include OAuth alternative path."
    },
    {
      "type": "mindmap",
      "title": "Feature Documentation",
      "description": "Hierarchical view of all features and modules",
      "priority": 3,
      "components_to_include": ["Features", "Modules", "Subfeatures"],
      "generation_prompt": "Create a mind map with the main product at center, branching to major features: User Management, Dashboard, Reports, Settings. Each branch shows subfeatures."
    }
  ],
  "rationale": "Brief explanation of why these diagrams were chosen"
}
```

## Important Notes

- **generation_prompt**: Must be a clear, specific prompt that can be used directly with the diagram generator
- **priority**: 1 is highest, determines generation order (architecture first, then flowcharts)
- **components_to_include**: Key elements that MUST appear in the diagram
- Focus on diagrams that provide actionable insights, not just documentation

## Expected Output Size
- 1 architecture diagram (always)
- N flowcharts where N = number of distinct business processes detected
- Typically 5-15 diagrams total for a medium-sized codebase
- Don't artificially limit - if you see 10 distinct flows, create 10 flowcharts"""


def get_diagram_planner_prompt(
    code_analysis: Dict[str, Any],
    repo_name: str = "Unknown",
) -> str:
    """
    Build the complete diagram planner prompt with code analysis.

    Args:
        code_analysis: Result from code analyzer agent
        repo_name: Repository name for context

    Returns:
        Complete prompt string
    """
    prompt = DIAGRAM_PLANNER_PROMPT

    prompt += f"\n\n## Repository: {repo_name}\n"

    # Add architecture summary
    prompt += "\n### Architecture Analysis\n"
    prompt += f"- **Type**: {code_analysis.get('architecture_type', 'unknown')}\n"
    prompt += f"- **Summary**: {code_analysis.get('architecture_summary', 'No summary available')}\n"

    # Add components
    components = code_analysis.get("components", [])
    if components:
        prompt += "\n### Components\n"
        for comp in components[:10]:
            name = comp.get("name", "Unknown")
            ctype = comp.get("type", "unknown")
            purpose = comp.get("purpose", "")
            prompt += f"- **{name}** ({ctype}): {purpose}\n"

    # Add data flows (no limit - we want flowcharts for all of them)
    flows = code_analysis.get("data_flows", [])
    if flows:
        prompt += "\n### Data Flows (create 1 flowchart per flow)\n"
        for flow in flows:
            name = flow.get("name", "Flow")
            src = flow.get("source", "?")
            dst = flow.get("destination", "?")
            desc = flow.get("description", "")
            prompt += f"- **{name}**: {src} → {dst}"
            if desc:
                prompt += f" ({desc})"
            prompt += "\n"

    # Add business processes (no limit - we want flowcharts for all of them)
    processes = code_analysis.get("business_processes", [])
    if processes:
        prompt += "\n### Business Processes (create 1 flowchart per process)\n"
        for proc in processes:
            name = proc.get("name", "Process")
            steps = proc.get("steps", [])
            components = proc.get("components_involved", [])
            prompt += f"- **{name}**: {' → '.join(steps[:8])}"
            if components:
                prompt += f" [involves: {', '.join(components[:5])}]"
            prompt += "\n"

    # Add API info
    api = code_analysis.get("api_surface", {})
    if api:
        prompt += "\n### API Surface\n"
        prompt += f"- Style: {api.get('style', 'unknown')}\n"
        prompt += f"- Authentication: {api.get('authentication', 'unknown')}\n"
        prompt += f"- Endpoints: ~{api.get('endpoint_count', 0)}\n"

    # Add integrations
    integrations = code_analysis.get("integrations", [])
    if integrations:
        prompt += "\n### External Integrations\n"
        for integ in integrations[:5]:
            name = integ.get("name", "Unknown")
            itype = integ.get("type", "")
            prompt += f"- {name} ({itype})\n"

    # Add insights
    insights = code_analysis.get("insights", [])
    if insights:
        prompt += "\n### Key Insights\n"
        for insight in insights[:5]:
            prompt += f"- {insight}\n"

    return prompt
