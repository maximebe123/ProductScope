"""
Streaming Agent Executor

Provides utilities for executing AI agents with real-time streaming
of reasoning tokens (GPT-5) and content tokens.

Key features:
- Stream reasoning summaries from GPT-5 models via Responses API
- Stream content tokens for all models
- Parse structured output (Pydantic) at the end of streaming
- Support for both reasoning models (GPT-5) and execution models (GPT-4o)

Note: Reasoning summaries require organization verification on OpenAI.
See: https://platform.openai.com/settings/organization/general
"""

import json
import logging
from typing import Any, AsyncGenerator, Dict, List, Optional, Type, get_origin, get_args

from openai.types.responses import (
    ResponseReasoningSummaryTextDeltaEvent,
    ResponseTextDeltaEvent,
    ResponseCompletedEvent,
)
from pydantic import BaseModel, ValidationError

from app.core.ai.client import get_openai_client

logger = logging.getLogger(__name__)


# Models that support reasoning summaries via Responses API
REASONING_MODELS = {"gpt-5", "gpt-5-mini", "gpt-5.1", "gpt-5.2", "o1", "o1-mini", "o1-preview", "o3", "o3-mini"}


def is_reasoning_model(model: str) -> bool:
    """Check if a model supports reasoning_content streaming."""
    return any(rm in model.lower() for rm in REASONING_MODELS)


def smart_parse_model(content: str, response_model: Type[BaseModel], agent_name: str) -> BaseModel:
    """
    Intelligently parse JSON content into the response model.

    Handles cases where models return:
    - Raw arrays: [...] when expecting {"items": [...]}
    - Wrapped objects: {"items": [...]}
    - Markdown-wrapped JSON: ```json ... ```
    """
    # First, try to extract JSON from markdown if present
    import re
    json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', content)
    if json_match:
        content = json_match.group(1).strip()

    # Try direct parse first
    try:
        return response_model.model_validate_json(content)
    except ValidationError:
        pass

    # Try to parse as raw JSON
    try:
        data = json.loads(content)

        # If it's already a dict, try direct validation
        if isinstance(data, dict):
            return response_model.model_validate(data)

        # If it's a list, find the first list field in the model and wrap it
        if isinstance(data, list):
            # Get the model's field names
            for field_name, field_info in response_model.model_fields.items():
                annotation = field_info.annotation
                # Check if this field is a List type
                if get_origin(annotation) is list:
                    logger.info(f"[StreamExecutor] Wrapping array in '{field_name}' for {agent_name}")
                    return response_model.model_validate({field_name: data})

    except json.JSONDecodeError:
        pass

    # Final attempt: raise original error for debugging
    return response_model.model_validate_json(content)


async def _stream_with_responses_api(
    client: AsyncOpenAI,
    messages: List[Dict[str, str]],
    model: str,
    agent_name: str,
    reasoning_effort: str,
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Stream using the Responses API (for reasoning models like GPT-5, o1, o3).

    Attempts to stream reasoning summaries. Falls back to content-only if
    organization verification is not complete.
    """
    # Convert messages to a single input string for Responses API
    # The Responses API uses 'input' instead of 'messages'
    input_text = "\n".join(
        f"{msg['role'].upper()}: {msg['content']}"
        for msg in messages
    )

    reasoning_tokens = 0
    content_tokens = 0

    try:
        # Try with reasoning summary enabled
        stream = await client.responses.create(
            model=model,
            input=input_text,
            stream=True,
            reasoning={"effort": reasoning_effort, "summary": "concise"}
        )
    except Exception as e:
        # If summary fails (org not verified), try without summary
        if "verified" in str(e).lower() or "summary" in str(e).lower():
            logger.warning(f"[StreamExecutor] Reasoning summary not available: {e}")
            logger.info(f"[StreamExecutor] Falling back to Responses API without summary")
            stream = await client.responses.create(
                model=model,
                input=input_text,
                stream=True,
                reasoning={"effort": reasoning_effort}
            )
        else:
            raise

    async for event in stream:
        event_type = type(event).__name__

        # Stream reasoning summary tokens
        if isinstance(event, ResponseReasoningSummaryTextDeltaEvent):
            reasoning_tokens += 1
            yield {
                "type": "reasoning",
                "agent": agent_name,
                "token": event.delta
            }

        # Stream text content tokens
        elif isinstance(event, ResponseTextDeltaEvent):
            content_tokens += 1
            yield {
                "type": "content",
                "agent": agent_name,
                "token": event.delta
            }

        # Handle completion event to extract final text if needed
        elif isinstance(event, ResponseCompletedEvent):
            # If no content was streamed, extract from response
            if content_tokens == 0 and event.response and event.response.output:
                for output_item in event.response.output:
                    if hasattr(output_item, 'content'):
                        for content in output_item.content:
                            if hasattr(content, 'text'):
                                yield {
                                    "type": "content",
                                    "agent": agent_name,
                                    "token": content.text
                                }

    logger.info(f"[StreamExecutor] {agent_name}: {reasoning_tokens} reasoning tokens, {content_tokens} content tokens (Responses API)")


async def _stream_with_chat_api(
    client: AsyncOpenAI,
    messages: List[Dict[str, str]],
    model: str,
    agent_name: str,
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Stream using the Chat Completions API (for non-reasoning models like GPT-4o).
    """
    content_tokens = 0

    stream = await client.chat.completions.create(
        model=model,
        messages=messages,
        stream=True,
        response_format={"type": "json_object"}
    )

    async for chunk in stream:
        if not chunk.choices:
            continue

        delta = chunk.choices[0].delta

        if delta.content:
            content_tokens += 1
            yield {
                "type": "content",
                "agent": agent_name,
                "token": delta.content
            }

    logger.info(f"[StreamExecutor] {agent_name}: {content_tokens} content tokens (Chat API)")


async def stream_with_structured_output(
    messages: List[Dict[str, str]],
    model: str,
    response_model: Type[BaseModel],
    agent_name: str = "agent",
    reasoning_effort: str = "medium",
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Stream an OpenAI completion with reasoning summaries and parse structured output.

    For GPT-5/o1 models: Uses Responses API to stream reasoning summaries.
    For GPT-4o models: Uses Chat Completions API to stream content tokens.

    Args:
        messages: Chat messages to send to the model
        model: Model ID (e.g., "gpt-5.2", "gpt-4o")
        response_model: Pydantic model class for parsing the response
        agent_name: Name of the agent for event identification
        reasoning_effort: Reasoning effort level for GPT-5.2 ("low", "medium", "high")

    Yields:
        Events with types:
        - {"type": "reasoning", "agent": str, "token": str}
        - {"type": "content", "agent": str, "token": str}
        - {"type": "parsed", "agent": str, "data": BaseModel}
        - {"type": "error", "agent": str, "message": str}
    """
    client = get_openai_client()
    content_buffer = ""
    has_reasoning = is_reasoning_model(model)

    logger.info(f"[StreamExecutor] Starting stream for {agent_name} with model {model}")

    try:
        if has_reasoning:
            # Use Responses API for reasoning models (GPT-5, o1, o3)
            async for event in _stream_with_responses_api(
                client=client,
                messages=messages,
                model=model,
                agent_name=agent_name,
                reasoning_effort=reasoning_effort,
            ):
                if event["type"] == "content":
                    content_buffer += event["token"]
                yield event
        else:
            # Use Chat Completions API for non-reasoning models (GPT-4o)
            async for event in _stream_with_chat_api(
                client=client,
                messages=messages,
                model=model,
                agent_name=agent_name,
            ):
                if event["type"] == "content":
                    content_buffer += event["token"]
                yield event

        # Parse accumulated content as structured output
        if content_buffer:
            try:
                parsed = smart_parse_model(content_buffer, response_model, agent_name)
                yield {
                    "type": "parsed",
                    "agent": agent_name,
                    "data": parsed
                }
                logger.info(f"[StreamExecutor] Successfully parsed {agent_name} output")

            except (ValidationError, json.JSONDecodeError) as e:
                logger.warning(f"[StreamExecutor] Validation error for {agent_name}: {e}")
                logger.debug(f"[StreamExecutor] Content was: {content_buffer[:500]}...")
                yield {
                    "type": "error",
                    "agent": agent_name,
                    "message": f"Failed to parse response: {str(e)}"
                }

            except Exception as e:
                logger.warning(f"[StreamExecutor] Parse error for {agent_name}: {e}")
                yield {
                    "type": "error",
                    "agent": agent_name,
                    "message": f"Failed to parse response: {str(e)}"
                }
        else:
            yield {
                "type": "error",
                "agent": agent_name,
                "message": "No content received from model"
            }

    except Exception as e:
        logger.error(f"[StreamExecutor] Stream error for {agent_name}: {e}", exc_info=True)
        yield {
            "type": "error",
            "agent": agent_name,
            "message": str(e)
        }


async def stream_without_structured_output(
    messages: List[Dict[str, str]],
    model: str,
    agent_name: str = "agent",
    reasoning_effort: str = "medium",
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Stream an OpenAI completion without structured output parsing.

    Useful for agents that don't need Pydantic validation.

    Args:
        messages: Chat messages to send to the model
        model: Model ID
        agent_name: Name of the agent for event identification
        reasoning_effort: Reasoning effort level for GPT-5

    Yields:
        Events with types:
        - {"type": "reasoning", "agent": str, "token": str}
        - {"type": "content", "agent": str, "token": str}
        - {"type": "complete", "agent": str, "content": str}
        - {"type": "error", "agent": str, "message": str}
    """
    client = get_openai_client()
    content_buffer = ""
    has_reasoning = is_reasoning_model(model)

    try:
        request_params = {
            "model": model,
            "messages": messages,
            "stream": True,
        }

        if has_reasoning:
            request_params["reasoning_effort"] = reasoning_effort

        stream = await client.chat.completions.create(**request_params)

        async for chunk in stream:
            if not chunk.choices:
                continue

            delta = chunk.choices[0].delta

            if hasattr(delta, 'reasoning_content') and delta.reasoning_content:
                yield {
                    "type": "reasoning",
                    "agent": agent_name,
                    "token": delta.reasoning_content
                }

            elif delta.content:
                content_buffer += delta.content
                yield {
                    "type": "content",
                    "agent": agent_name,
                    "token": delta.content
                }

        yield {
            "type": "complete",
            "agent": agent_name,
            "content": content_buffer
        }

    except Exception as e:
        logger.error(f"[StreamExecutor] Stream error for {agent_name}: {e}", exc_info=True)
        yield {
            "type": "error",
            "agent": agent_name,
            "message": str(e)
        }
