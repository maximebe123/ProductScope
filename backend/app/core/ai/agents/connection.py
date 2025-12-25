"""
Connection Expert Agent

Defines edges between components with protocol labels.
Uses GPT-5-mini for fast, pattern-based edge creation.
"""

import logging
from typing import Any, Dict, List

from pydantic import BaseModel

from app.config import settings
from app.core.ai.agent_state import MultiAgentState, ConnectionSpec
from app.core.ai.client import get_openai_client
from app.core.ai.prompts.connection_prompt import get_connection_prompt

logger = logging.getLogger(__name__)


class ConnectionListResponse(BaseModel):
    """Wrapper for connection list response"""
    connections: List[ConnectionSpec]


async def connection_agent(state: MultiAgentState) -> Dict[str, Any]:
    """
    Connection Expert: Defines edges with protocol labels.

    Uses GPT-5-mini for fast, pattern-based edge creation.

    Args:
        state: Current multi-agent state

    Returns:
        Dict with connections list and updated state fields
    """
    logger.info("[Connection] Starting connection definition")

    components = state.get("components", [])
    if not components:
        logger.error("[Connection] No components available")
        return {
            "connections": [],
            "current_agent": "connection",
            "warnings": ["No components to connect"]
        }

    # Get the specialized prompt
    prompt = get_connection_prompt(components)

    # Build user message
    user_message = """Define the connections between these components.

Every connection MUST have a protocol label.
Return a JSON object with a 'connections' array."""

    # Call GPT-5-mini for fast reasoning
    client = get_openai_client()

    try:
        # Note: GPT-5-mini reasoning models don't support temperature parameter
        response = await client.beta.chat.completions.parse(
            model=settings.MODEL_CONNECTION,
            reasoning_effort="low",  # Fast pattern-based connections
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": user_message}
            ],
            response_format=ConnectionListResponse,
        )

        result = response.choices[0].message.parsed
        connections = result.connections

        logger.info(f"[Connection] Created {len(connections)} connections")

        # Log protocol breakdown
        protocols = {}
        for c in connections:
            protocols[c.label] = protocols.get(c.label, 0) + 1
        logger.info(f"[Connection] Protocols: {protocols}")

        # Update agent history
        agent_history = state.get("agent_history", []).copy()
        agent_history.append("connection")

        return {
            "connections": connections,
            # Note: current_agent not updated here to avoid parallel write conflict
            "messages": [{
                "role": "system",
                "content": f"[Connection] Created {len(connections)} connections"
            }]
        }

    except Exception as e:
        logger.error(f"[Connection] Error: {e}", exc_info=True)

        # Fallback: create basic connections based on component types
        fallback_connections = []

        # Find frontend and backend components
        frontends = [c for c in components if c.nodeType in ["webapp", "mobile"]]
        backends = [c for c in components if c.nodeType in ["backend", "api", "gateway"]]
        databases = [c for c in components if c.nodeType in ["sql", "nosql", "cache"]]

        edge_id = 0

        # Connect frontends to backends
        for frontend in frontends:
            for backend in backends[:1]:  # Connect to first backend only
                fallback_connections.append(ConnectionSpec(
                    id=f"edge_{edge_id}",
                    source=frontend.id,
                    target=backend.id,
                    label="REST/JSON",
                    rationale="Frontend to backend connection"
                ))
                edge_id += 1

        # Connect backends to databases
        for backend in backends:
            for db in databases[:1]:  # Connect to first database only
                fallback_connections.append(ConnectionSpec(
                    id=f"edge_{edge_id}",
                    source=backend.id,
                    target=db.id,
                    label="PostgreSQL" if db.nodeType == "sql" else "Redis",
                    rationale="Backend to database connection"
                ))
                edge_id += 1

        return {
            "connections": fallback_connections,
            "warnings": [f"Connection fallback used: {str(e)}"],
            "messages": [{
                "role": "system",
                "content": "[Connection] Using fallback connections"
            }]
        }
