"""API endpoint for AI mind map operations with context awareness

Uses LangGraph multi-agent architecture for:
- Automatic validation of mindmap structure
- Self-correction via reflection loop
- Retry logic for improved quality
"""

import logging
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
import json

from app.config import settings
from app.modules.mindmap.models import (
    MindMapOperationRequest,
    MindMapOperationResponse,
    ErrorResponse,
)
from app.modules.mindmap.services.ai_tools import ALL_MINDMAP_TOOLS
from app.modules.mindmap.services.operation_handler import mindmap_operation_handler
from app.modules.mindmap.utils.prompts import get_mindmap_system_prompt, build_mindmap_context_prompt
from app.services.common_operation_handler import ModuleConfig, execute_ai_operation
from app.services.langgraph_handler import execute_with_langgraph, execute_with_langgraph_stream, is_langgraph_enabled

logger = logging.getLogger(__name__)

router = APIRouter()

# Rate limiter instance
limiter = Limiter(key_func=get_remote_address)

# Module configuration for mind maps
MINDMAP_CONFIG = ModuleConfig(
    module_name="mindmap",
    tools=ALL_MINDMAP_TOOLS,
    operation_handler=mindmap_operation_handler,
    get_system_prompt=get_mindmap_system_prompt,
    build_context_prompt=build_mindmap_context_prompt,
    response_class=MindMapOperationResponse,
    default_operation_type="generate",
    no_tool_message="I couldn't understand the request. Please describe what you want to do with the mind map.",
)


@router.post(
    "/operations",
    response_model=MindMapOperationResponse,
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
        429: {"description": "Rate limit exceeded"},
    }
)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def execute_mindmap_operation(request: Request, body: MindMapOperationRequest) -> MindMapOperationResponse:
    """
    Execute an AI-powered mind map operation with context awareness.

    Uses LangGraph multi-agent architecture for:
    - Automatic mindmap structure validation
    - Self-correction via reflection on errors
    - Up to 3 retry attempts for valid output

    This endpoint supports all mind map operations:
    - generate: Create new mind map from scratch
    - add: Add nodes to existing mind map
    - modify: Update existing nodes
    - delete: Remove nodes
    - connect: Create new connections
    - disconnect: Remove connections
    - expand_branch: Generate sub-ideas for a node
    - group: Create logical groups

    The AI automatically selects the appropriate operation based on the user's
    natural language description and the current mind map context.
    """
    # Build context dict from request
    context_dict = body.context.dict() if body.context else None

    # Build conversation history
    history = None
    if body.conversation_history:
        history = [{"role": msg.role, "content": msg.content} for msg in body.conversation_history]

    # Quick mode: always use single-shot for faster response
    if body.mode == "quick":
        logger.info("[MindMap] Using single-shot (Quick mode)")
        return await execute_ai_operation(body, MINDMAP_CONFIG)

    # Advanced mode: use LangGraph if available
    if is_langgraph_enabled():
        logger.info("[MindMap] Using LangGraph multi-agent pipeline (Advanced mode)")

        # Execute with LangGraph
        result = await execute_with_langgraph(
            description=body.description,
            module_type="mindmap",
            context=context_dict,
            conversation_history=history,
            max_attempts=settings.DEFAULT_MAX_ATTEMPTS
        )

        return MindMapOperationResponse(**result)

    # Fallback to original single-shot method
    logger.info("[MindMap] LangGraph not available, using fallback")
    return await execute_ai_operation(body, MINDMAP_CONFIG)


@router.post(
    "/operations/stream",
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
        429: {"description": "Rate limit exceeded"},
    }
)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def stream_mindmap_operation(request: Request, body: MindMapOperationRequest):
    """
    Stream an AI-powered mind map operation with progress updates.

    Returns server-sent events with:
    - node_update: Progress as each agent completes
    - complete: Final result
    - error: If something fails

    Useful for showing validation/retry progress to the user.
    """
    # Build context and history
    context_dict = body.context.dict() if body.context else None
    history = None
    if body.conversation_history:
        history = [{"role": msg.role, "content": msg.content} for msg in body.conversation_history]

    # Quick mode: execute normally and return single result
    if body.mode == "quick" or not is_langgraph_enabled():
        result = await execute_ai_operation(body, MINDMAP_CONFIG)
        return StreamingResponse(
            iter([json.dumps({"type": "complete", "data": result.dict()}) + "\n"]),
            media_type="application/x-ndjson"
        )

    # Advanced mode with LangGraph streaming
    async def generate():
        async for update in execute_with_langgraph_stream(
            description=body.description,
            module_type="mindmap",
            context=context_dict,
            conversation_history=history,
            max_attempts=1
        ):
            yield json.dumps(update) + "\n"

    return StreamingResponse(generate(), media_type="application/x-ndjson")
