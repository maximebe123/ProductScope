"""API endpoint for AI diagram operations with context awareness

Uses Multi-Agent architecture for high-quality diagram generation:
- 7 specialized agents (Architect, Component, Connection, Grouping, Layout, Reviewer, Finalizer)
- GPT-5 for deep reasoning, GPT-5-mini for fast reasoning, GPT-4o for execution
- Quality review loop with routing back to specific agents
- Automatic validation and self-correction
"""

import logging
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
import json

from app.config import settings
from app.models.operations import OperationRequest, OperationResponse, ErrorResponse
from app.services.ai_tools import ALL_TOOLS
from app.services.operation_handler import operation_handler
from app.services.common_operation_handler import ModuleConfig, execute_ai_operation
from app.utils.prompts import get_system_prompt, build_context_prompt
from app.services.langgraph_handler import execute_with_langgraph, execute_with_langgraph_stream, is_langgraph_enabled
from app.services.multi_agent_handler import (
    execute_with_multi_agent,
    execute_with_multi_agent_stream,
    is_multi_agent_enabled
)
from app.services.multi_agent_streaming import execute_multi_agent_with_streaming

logger = logging.getLogger(__name__)

router = APIRouter()

# Rate limiter instance
limiter = Limiter(key_func=get_remote_address)

# Module configuration for diagrams
DIAGRAM_CONFIG = ModuleConfig(
    module_name="diagrams",
    tools=ALL_TOOLS,
    operation_handler=operation_handler,
    get_system_prompt=get_system_prompt,
    build_context_prompt=build_context_prompt,
    response_class=OperationResponse,
    default_operation_type="generate",
    no_tool_message="I couldn't understand the request. Please describe what you want to do with the diagram.",
)


@router.post(
    "/operations",
    response_model=OperationResponse,
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
        429: {"description": "Rate limit exceeded"},
    }
)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def execute_operation(request: Request, body: OperationRequest) -> OperationResponse:
    """
    Execute an AI-powered diagram operation with context awareness.

    Uses Multi-Agent architecture for high-quality generation:
    - 7 specialized agents with GPT-5/GPT-5-mini/GPT-4o
    - Quality review loop with routing to specific agents
    - Automatic validation and self-correction
    - Up to 3 retry attempts for valid output

    This endpoint supports all diagram operations:
    - generate: Create new diagram from scratch
    - add: Add nodes/edges to existing diagram
    - modify: Update existing nodes/edges
    - delete: Remove nodes/edges
    - connect: Create new connections
    - disconnect: Remove connections
    - group: Create logical groups

    The AI automatically selects the appropriate operation based on the user's
    natural language description and the current diagram context.
    """
    # Build context dict from request
    context_dict = body.context.dict() if body.context else None

    # Build conversation history
    history = None
    if body.conversation_history:
        history = [{"role": msg.role, "content": msg.content} for msg in body.conversation_history]

    # Quick mode: always use single-shot for faster response
    if body.mode == "quick":
        logger.info("[Diagrams] Using single-shot (Quick mode)")
        return await execute_ai_operation(body, DIAGRAM_CONFIG)

    # Advanced mode: use Multi-Agent if enabled (new architecture with GPT-5)
    if is_multi_agent_enabled():
        logger.info("[Diagrams] Using Multi-Agent pipeline (Advanced mode)")

        result = await execute_with_multi_agent(
            description=body.description,
            module_type="diagrams",
            context=context_dict,
            conversation_history=history,
            max_attempts=settings.DEFAULT_MAX_ATTEMPTS,
            max_review_iterations=settings.MAX_REVIEW_ITERATIONS
        )

        return OperationResponse(**result)

    # Fallback to LangGraph if available
    if is_langgraph_enabled():
        logger.info("[Diagrams] Using LangGraph pipeline (Advanced mode fallback)")

        result = await execute_with_langgraph(
            description=body.description,
            module_type="diagrams",
            context=context_dict,
            conversation_history=history,
            max_attempts=settings.DEFAULT_MAX_ATTEMPTS
        )

        return OperationResponse(**result)

    # Final fallback to original single-shot method
    logger.info("[Diagrams] Using single-shot fallback")
    return await execute_ai_operation(body, DIAGRAM_CONFIG)


@router.post(
    "/operations/stream",
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
        429: {"description": "Rate limit exceeded"},
    }
)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def stream_diagram_operation(request: Request, body: OperationRequest):
    """
    Stream an AI-powered diagram operation with progress updates.

    Returns server-sent events with:
    - agent_update: Progress as each specialized agent completes
    - review: Quality review score and decision
    - complete: Final result
    - error: If something fails

    Useful for showing multi-agent progress to the user.
    """
    # Build context and history
    context_dict = body.context.dict() if body.context else None
    history = None
    if body.conversation_history:
        history = [{"role": msg.role, "content": msg.content} for msg in body.conversation_history]

    # Quick mode: execute normally and return single result
    if body.mode == "quick":
        result = await execute_ai_operation(body, DIAGRAM_CONFIG)
        return StreamingResponse(
            iter([json.dumps({"type": "complete", "data": result.dict()}) + "\n"]),
            media_type="application/x-ndjson"
        )

    # Use Multi-Agent streaming if enabled (Advanced mode)
    if is_multi_agent_enabled():
        async def generate_multi_agent():
            async for update in execute_with_multi_agent_stream(
                description=body.description,
                module_type="diagrams",
                context=context_dict,
                conversation_history=history,
                max_attempts=settings.DEFAULT_MAX_ATTEMPTS,
                max_review_iterations=settings.MAX_REVIEW_ITERATIONS
            ):
                yield json.dumps(update) + "\n"

        return StreamingResponse(generate_multi_agent(), media_type="application/x-ndjson")

    # Fallback to LangGraph streaming
    if is_langgraph_enabled():
        async def generate_langgraph():
            async for update in execute_with_langgraph_stream(
                description=body.description,
                module_type="diagrams",
                context=context_dict,
                conversation_history=history,
                max_attempts=settings.DEFAULT_MAX_ATTEMPTS
            ):
                yield json.dumps(update) + "\n"

        return StreamingResponse(generate_langgraph(), media_type="application/x-ndjson")

    # Final fallback: execute normally and return single result
    result = await execute_ai_operation(body, DIAGRAM_CONFIG)
    return StreamingResponse(
        iter([json.dumps({"type": "complete", "data": result.dict()}) + "\n"]),
        media_type="application/x-ndjson"
    )


@router.get("/operations/test-sse")
async def test_sse():
    """Test endpoint to verify SSE works."""
    import asyncio

    async def generate():
        for i in range(5):
            yield f"data: {json.dumps({'type': 'test', 'count': i})}\n\n"
            await asyncio.sleep(0.5)
        yield f"data: {json.dumps({'type': 'complete'})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.post(
    "/operations/stream-thinking",
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
        429: {"description": "Rate limit exceeded"},
    }
)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def stream_thinking_operation(request: Request, body: OperationRequest):
    """
    Stream an AI-powered diagram operation with real-time reasoning tokens.

    This endpoint provides full visibility into the agent thinking process:
    - agent_start: When an agent begins processing
    - reasoning: Real-time reasoning tokens from GPT-5 models
    - agent_complete: When an agent finishes with a summary
    - review: Quality review score and decision
    - complete: Final diagram result
    - error: If something fails

    Uses Server-Sent Events (SSE) format for real-time streaming.
    Only available in 'advanced' mode.
    """
    # Build context and history
    context_dict = body.context.dict() if body.context else None
    history = None
    if body.conversation_history:
        history = [{"role": msg.role, "content": msg.content} for msg in body.conversation_history]

    # Quick mode: execute normally and return single result (no reasoning)
    if body.mode == "quick":
        result = await execute_ai_operation(body, DIAGRAM_CONFIG)

        async def quick_response():
            yield f"data: {json.dumps({'type': 'complete', 'data': result.dict()})}\n\n"

        return StreamingResponse(
            quick_response(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            }
        )

    # Advanced mode: stream with reasoning tokens
    async def generate_sse():
        try:
            event_count = 0
            async for event in execute_multi_agent_with_streaming(
                description=body.description,
                module_type="diagrams",
                context=context_dict,
                conversation_history=history,
                max_attempts=settings.DEFAULT_MAX_ATTEMPTS,
                max_review_iterations=settings.MAX_REVIEW_ITERATIONS
            ):
                event_count += 1
                # Log first few events and milestones
                if event_count <= 5 or event.get("type") in ["agent_start", "agent_complete", "complete", "error"]:
                    logger.info(f"[StreamThinking] Event #{event_count}: {event.get('type')}")

                # Serialize event to JSON (handles Pydantic models if present)
                try:
                    if "data" in event and hasattr(event["data"], "dict"):
                        # Pydantic model - convert to dict
                        event["data"] = event["data"].dict()
                    json_str = json.dumps(event, default=str)
                    yield f"data: {json_str}\n\n"
                except Exception as ser_err:
                    logger.error(f"[StreamThinking] Serialization error: {ser_err}", exc_info=True)
                    yield f"data: {json.dumps({'type': 'error', 'message': f'Serialization error: {str(ser_err)}'})}\n\n"

            logger.info(f"[StreamThinking] Stream completed with {event_count} events")
        except Exception as e:
            logger.error(f"[StreamThinking] Error: {e}", exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        generate_sse(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
