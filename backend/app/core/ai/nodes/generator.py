"""
Generator Agent Node

Calls the LLM with appropriate tools to generate diagram operations.
Handles retry logic by incorporating reflection feedback.
"""

import json
import logging
from typing import Any, Dict, List, Optional

from openai import AsyncOpenAI

from app.config import settings
from ..graph_state import GraphState

logger = logging.getLogger(__name__)

# Lazy-loaded OpenAI client
_client: Optional[AsyncOpenAI] = None


def get_openai_client() -> AsyncOpenAI:
    """Get or create OpenAI client singleton."""
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


def _get_tools_for_module(module_type: str) -> List[dict]:
    """Get the appropriate tools for the module type."""
    if module_type == "flowchart":
        from app.modules.flowchart.services.ai_tools import ALL_FLOWCHART_TOOLS
        return ALL_FLOWCHART_TOOLS
    elif module_type == "diagrams":
        from app.services.ai_tools import ALL_TOOLS
        return ALL_TOOLS
    elif module_type == "mindmap":
        from app.modules.mindmap.services.ai_tools import ALL_MINDMAP_TOOLS
        return ALL_MINDMAP_TOOLS
    else:
        raise ValueError(f"Unknown module type: {module_type}")


def _get_system_prompt(module_type: str) -> str:
    """Get the system prompt for the module type."""
    if module_type == "flowchart":
        from app.modules.flowchart.utils.prompts import get_flowchart_system_prompt
        return get_flowchart_system_prompt()
    elif module_type == "diagrams":
        from app.utils.prompts import get_system_prompt
        return get_system_prompt()
    elif module_type == "mindmap":
        from app.modules.mindmap.utils.prompts import get_mindmap_system_prompt
        return get_mindmap_system_prompt()
    else:
        raise ValueError(f"Unknown module type: {module_type}")


def _get_context_prompt(module_type: str, context: Optional[dict]) -> str:
    """Get the context prompt for the module type."""
    if not context:
        return ""

    if module_type == "flowchart":
        from app.modules.flowchart.utils.prompts import build_flowchart_context_prompt
        from app.modules.flowchart.models import FlowchartContext
        ctx = FlowchartContext(**context) if isinstance(context, dict) else context
        return build_flowchart_context_prompt(ctx)
    elif module_type == "diagrams":
        from app.utils.prompts import build_context_prompt
        from app.models.operations import DiagramContext
        ctx = DiagramContext(**context) if isinstance(context, dict) else context
        return build_context_prompt(ctx)
    elif module_type == "mindmap":
        from app.modules.mindmap.utils.prompts import build_mindmap_context_prompt
        from app.modules.mindmap.models import MindMapContext
        ctx = MindMapContext(**context) if isinstance(context, dict) else context
        return build_mindmap_context_prompt(ctx)

    return ""


def _build_messages(state: GraphState, system_prompt: str) -> List[dict]:
    """Build the messages array for the OpenAI API call."""
    messages = [{"role": "system", "content": system_prompt}]

    # Add conversation history
    for msg in state.get("conversation_history", []):
        messages.append({
            "role": msg.get("role", "user"),
            "content": msg.get("content", "")
        })

    # Add previous messages from this graph execution
    for msg in state.get("messages", []):
        if msg.get("role") and msg.get("content"):
            messages.append(msg)

    # Add reflection feedback if this is a retry
    if state.get("reflection_feedback"):
        messages.append({
            "role": "system",
            "content": f"""## Previous Attempt Feedback

Your previous response had validation errors. Please fix these issues:

{state['reflection_feedback']}

IMPORTANT: Apply the fixes and generate valid output."""
        })

    # Add current user request
    messages.append({
        "role": "user",
        "content": state["user_request"]
    })

    return messages


def _extract_output(tool_name: str, tool_args: dict) -> Optional[str]:
    """Extract the generated output (e.g., Mermaid code) from tool arguments."""
    # Flowchart tools typically have mermaid_code
    if "mermaid_code" in tool_args:
        return tool_args["mermaid_code"]

    # Or mermaid_lines for add_nodes
    if "mermaid_lines" in tool_args:
        return "\n".join(tool_args["mermaid_lines"])

    # Diagram tools have nodes/edges
    if "nodes" in tool_args or "edges" in tool_args:
        return json.dumps(tool_args)

    # Mindmap tools have root or nodes
    if "root" in tool_args:
        return json.dumps(tool_args)

    return None


async def generator_node(state: GraphState) -> Dict[str, Any]:
    """
    Generator Agent: Calls LLM with tools to generate operations.

    This node:
    1. Builds the system prompt with context
    2. Includes reflection feedback if this is a retry
    3. Calls OpenAI with module-specific tools
    4. Extracts tool name, arguments, and generated output

    Args:
        state: Current graph state

    Returns:
        Dict with tool_name, tool_arguments, generated_output, messages
    """
    module_type = state["module_type"]
    context = state.get("context")
    attempt = state.get("attempt_number", 0)

    logger.info(
        f"[Generator] Module: {module_type}, "
        f"Attempt: {attempt + 1}/{state.get('max_attempts', 3)}"
    )

    # Build system prompt
    system_prompt = _get_system_prompt(module_type)
    context_prompt = _get_context_prompt(module_type, context)
    if context_prompt:
        system_prompt += context_prompt

    # Get tools for this module
    tools = _get_tools_for_module(module_type)

    # Build messages
    messages = _build_messages(state, system_prompt)

    # Call OpenAI
    client = get_openai_client()

    try:
        response = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=messages,
            tools=tools,
            tool_choice="auto",
            temperature=0.7 if attempt == 0 else 0.5,  # Lower temp on retries
        )

        message = response.choices[0].message

        if message.tool_calls:
            tool_call = message.tool_calls[0]
            tool_name = tool_call.function.name
            tool_args = json.loads(tool_call.function.arguments)

            logger.info(f"[Generator] Tool selected: {tool_name}")

            return {
                "tool_name": tool_name,
                "tool_arguments": tool_args,
                "generated_output": _extract_output(tool_name, tool_args),
                "messages": [{
                    "role": "assistant",
                    "content": message.content or "",
                    "tool_call": tool_name
                }]
            }
        else:
            # No tool call - text response only
            logger.info("[Generator] No tool call, text response only")
            return {
                "tool_name": None,
                "tool_arguments": None,
                "generated_output": message.content,
                "messages": [{
                    "role": "assistant",
                    "content": message.content or ""
                }]
            }

    except Exception as e:
        logger.error(f"[Generator] Error calling OpenAI: {e}", exc_info=True)
        return {
            "tool_name": None,
            "tool_arguments": None,
            "generated_output": None,
            "messages": [{
                "role": "system",
                "content": f"Error: {str(e)}"
            }],
            "status": "failed"
        }
