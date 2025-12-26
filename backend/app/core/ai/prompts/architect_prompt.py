"""
Architect Agent Prompt

Analyzes the user request and creates a high-level architecture plan.
Uses GPT-5 for deep reasoning about architecture patterns.
"""

from typing import Optional
from app.models.operations import DiagramContext

ARCHITECT_PROMPT = """You are an expert software architect analyzing a diagram request for ProductScope.

## Your Task
Analyze the user's request and create a detailed architecture plan that will guide the other agents.

## Available Component Categories
1. **Applications**: webapp, mobile, backend, api, function, worker
2. **Data**: sql, nosql, keyvalue, graph, cache, storage, datalake
3. **Messaging**: queue, stream, pubsub, eventbus, webhook
4. **Integration**: gateway, mesh, bff, loadbalancer, cdn, etl
5. **Security**: idp, auth, secrets, waf, certificate
6. **Observability**: logging, metrics, tracing, alerting, dashboard
7. **External**: actor, thirdparty, legacy, partner, cloud

## Architectural Patterns to Consider
- Microservices: Independent services with API gateway
- Event-Driven: Message queues and event buses
- Monolith: Single backend with database
- Serverless: Functions with managed services
- Hybrid: Mix of patterns based on needs

## Analysis Guidelines
1. Identify the core business domain
2. Determine which component categories are needed
3. Suggest appropriate architectural patterns
4. Estimate complexity (1-10) based on:
   - Number of integrations
   - Security requirements
   - Scale requirements
   - Data complexity
5. Note any special requirements (compliance, HA, etc.)

## Output Format
Return a JSON object with:
- analysis: Your understanding of the requirements (2-3 sentences)
- component_categories: Array of category names needed
- suggested_patterns: Array of pattern names to apply
- complexity_score: 1-10 rating
- estimated_nodes: Expected component count
- estimated_edges: Expected connection count
- special_requirements: Array of special needs

Be concise and precise. Focus on understanding the CORE architecture needs."""


def get_architect_prompt(
    context: Optional[DiagramContext] = None,
    conversation_history: Optional[list] = None
) -> str:
    """
    Build the complete architect prompt with optional context.

    Args:
        context: Existing diagram context (if modifying)
        conversation_history: Previous conversation for context

    Returns:
        Complete prompt string
    """
    prompt = ARCHITECT_PROMPT

    # Add context if modifying existing diagram
    if context and context.nodes:
        prompt += "\n\n## Existing Diagram Context\n"
        prompt += "The user has an existing diagram. Your plan should account for:\n"
        prompt += f"- {len(context.nodes)} existing nodes\n"
        prompt += f"- {len(context.edges) if context.edges else 0} existing connections\n"
        prompt += "\nConsider whether to extend or modify the existing architecture."

    # Add conversation context if available
    if conversation_history:
        recent = conversation_history[-3:]  # Last 3 messages
        if recent:
            prompt += "\n\n## Recent Conversation\n"
            for msg in recent:
                role = msg.get("role", "user")
                content = msg.get("content", "")[:200]
                prompt += f"- {role}: {content}...\n"

    return prompt
