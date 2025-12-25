"""
Common AI Operation Handler Service

Provides a generic implementation for AI-powered operations
that can be used by all modules (diagrams, mindmap, flowchart).
"""

import json
import logging
from typing import Any, Callable, Protocol, TypeVar, List, Optional

from fastapi import HTTPException
from openai import AsyncOpenAI
from pydantic import BaseModel

from app.config import settings

logger = logging.getLogger(__name__)

# Initialize OpenAI client (singleton)
_client: Optional[AsyncOpenAI] = None


def get_openai_client() -> AsyncOpenAI:
    """Get or create OpenAI client singleton."""
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


# Type variable for response type
ResponseT = TypeVar('ResponseT', bound=BaseModel)


class OperationHandlerProtocol(Protocol):
    """Protocol for module-specific operation handlers."""

    def handle_tool_call(
        self,
        tool_name: str,
        arguments: dict,
        context: Any
    ) -> Any:
        """Handle a tool call and return the appropriate response."""
        ...


class ConversationMessage(Protocol):
    """Protocol for conversation messages."""
    role: str
    content: str


class BaseOperationRequest(Protocol):
    """Protocol for operation request base structure."""
    description: str
    context: Any
    conversation_history: Optional[List[Any]]


class ModuleConfig:
    """Configuration for a specific module's AI operations."""

    def __init__(
        self,
        *,
        module_name: str,
        tools: List[dict],
        operation_handler: OperationHandlerProtocol,
        get_system_prompt: Callable[[], str],
        build_context_prompt: Callable[[Any], str],
        response_class: type,
        default_operation_type: str = "generate",
        no_tool_message: str = "I couldn't understand the request. Please describe what you want to do.",
    ):
        self.module_name = module_name
        self.tools = tools
        self.operation_handler = operation_handler
        self.get_system_prompt = get_system_prompt
        self.build_context_prompt = build_context_prompt
        self.response_class = response_class
        self.default_operation_type = default_operation_type
        self.no_tool_message = no_tool_message


def get_context_node_count(context: Any) -> int:
    """Safely get node count from context."""
    if context is None:
        return 0
    if hasattr(context, 'nodes'):
        return len(context.nodes) if context.nodes else 0
    return 0


def get_context_edge_count(context: Any) -> int:
    """Safely get edge count from context."""
    if context is None:
        return 0
    if hasattr(context, 'edges'):
        return len(context.edges) if context.edges else 0
    return 0


async def execute_ai_operation(
    request: BaseOperationRequest,
    config: ModuleConfig,
) -> Any:
    """
    Execute an AI-powered operation using the common handler.

    This function:
    1. Validates the request
    2. Builds the system prompt with context
    3. Calls OpenAI with the appropriate tools
    4. Handles the tool call or text response
    5. Returns the appropriate response type

    Args:
        request: The operation request with description, context, and history
        config: Module-specific configuration

    Returns:
        The module-specific response type
    """
    description = request.description
    context = request.context
    conversation_history = request.conversation_history

    # Log the request
    logger.info(f"[{config.module_name}] Received operation: {description[:50]}...")
    if context:
        logger.info(
            f"[{config.module_name}] Context: "
            f"{get_context_node_count(context)} nodes, "
            f"{get_context_edge_count(context)} edges"
        )

    # Validate request
    if not description.strip():
        raise HTTPException(status_code=400, detail="Description cannot be empty")

    if len(description) > 1000000:
        raise HTTPException(status_code=400, detail="Description too long (max 1,000,000 characters)")

    try:
        # Build system prompt with context
        system_prompt = config.get_system_prompt()
        if context:
            system_prompt += config.build_context_prompt(context)
            logger.info(
                f"[{config.module_name}] Operation with context: "
                f"{get_context_node_count(context)} nodes"
            )
        else:
            logger.info(f"[{config.module_name}] Operation without context (empty)")

        # Build messages array
        messages = [{"role": "system", "content": system_prompt}]

        # Add conversation history if provided
        if conversation_history:
            for msg in conversation_history:
                messages.append({"role": msg.role, "content": msg.content})
            logger.info(
                f"[{config.module_name}] Including {len(conversation_history)} "
                "messages from conversation history"
            )

        # Add current user message
        messages.append({"role": "user", "content": description})

        # Call OpenAI
        client = get_openai_client()
        response = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=messages,
            tools=config.tools,
            tool_choice="auto",
            temperature=0.7,
        )

        # Process response
        message = response.choices[0].message

        if message.tool_calls:
            # Process the first tool call
            tool_call = message.tool_calls[0]
            tool_name = tool_call.function.name
            tool_args = json.loads(tool_call.function.arguments)

            logger.info(f"[{config.module_name}] AI selected tool: {tool_name}")

            # Execute the operation via module-specific handler
            result = config.operation_handler.handle_tool_call(
                tool_name=tool_name,
                arguments=tool_args,
                context=context
            )

            logger.info(
                f"[{config.module_name}] Result: {result.operation_type} - "
                f"{result.message[:100]}"
            )
            return result

        else:
            # No tool call - AI responded with text
            content = message.content or config.no_tool_message
            logger.info(f"[{config.module_name}] AI text response (no tool): {content[:100]}...")

            return config.response_class(
                success=False,
                operation_type=config.default_operation_type,
                message=content
            )

    except json.JSONDecodeError as e:
        logger.error(f"[{config.module_name}] JSON decode error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to parse AI response")
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"[{config.module_name}] Operation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
