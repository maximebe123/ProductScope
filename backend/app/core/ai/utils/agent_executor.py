"""
Agent Executor Utilities

Provides common patterns for executing AI agents with structured output.
"""

import logging
from typing import Any, Dict, List, Optional, Type, TypeVar

from pydantic import BaseModel

from app.core.ai.client import get_openai_client

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


async def execute_structured_completion(
    model: str,
    system_prompt: str,
    user_message: str,
    response_format: Type[T],
    agent_name: str,
    reasoning_effort: str = "medium",
    extra_messages: Optional[List[Dict[str, str]]] = None,
) -> T:
    """
    Execute a structured completion with standard logging.

    Args:
        model: Model ID to use (e.g., settings.MODEL_COMPONENT)
        system_prompt: System prompt for the agent
        user_message: User message to send
        response_format: Pydantic model class for response parsing
        agent_name: Name of the agent for logging (e.g., "Component")
        reasoning_effort: Reasoning effort level ("low", "medium", "high")
        extra_messages: Additional messages to include (e.g., conversation history)

    Returns:
        Parsed response as the specified Pydantic model

    Raises:
        Exception: If the API call fails
    """
    client = get_openai_client()

    messages = [{"role": "system", "content": system_prompt}]
    if extra_messages:
        messages.extend(extra_messages)
    messages.append({"role": "user", "content": user_message})

    response = await client.beta.chat.completions.parse(
        model=model,
        reasoning_effort=reasoning_effort,
        messages=messages,
        response_format=response_format,
    )

    result = response.choices[0].message.parsed
    logger.info(f"[{agent_name}] Completed structured completion")

    return result


def build_agent_response(
    agent_name: str,
    state: Dict[str, Any],
    updates: Dict[str, Any],
    message: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Build a standard agent response with history tracking.

    Args:
        agent_name: Name of the agent (lowercase, e.g., "component")
        state: Current agent state
        updates: Fields to update in the response
        message: Optional message to log

    Returns:
        Dict with updates and standard agent tracking fields
    """
    agent_history = state.get("agent_history", []).copy()
    agent_history.append(agent_name)

    response = {
        "current_agent": agent_name,
        "agent_history": agent_history,
        **updates,
    }

    if message:
        response["messages"] = [{
            "role": "system",
            "content": f"[{agent_name.capitalize()}] {message}"
        }]

    return response


def build_error_response(
    agent_name: str,
    state: Dict[str, Any],
    error: Exception,
    fallback_data: Optional[Dict[str, Any]] = None,
    message: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Build a standard error response for agents.

    Args:
        agent_name: Name of the agent (lowercase)
        state: Current agent state
        error: The exception that occurred
        fallback_data: Optional fallback data to include
        message: Optional custom error message

    Returns:
        Dict with error information and fallback data
    """
    logger.error(f"[{agent_name.capitalize()}] Error: {error}", exc_info=True)

    agent_history = state.get("agent_history", []).copy()
    agent_history.append(agent_name)

    response = {
        "current_agent": agent_name,
        "agent_history": agent_history,
        "warnings": [f"{agent_name.capitalize()} error: {str(error)}"],
        "messages": [{
            "role": "system",
            "content": message or f"[{agent_name.capitalize()}] Error: {str(error)}"
        }],
    }

    if fallback_data:
        response.update(fallback_data)

    return response
