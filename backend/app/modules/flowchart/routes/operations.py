"""API endpoint for AI flowchart operations with context awareness

Uses LangGraph multi-agent architecture for:
- Automatic validation of Mermaid syntax
- Self-correction via reflection loop
- Retry logic for improved quality
"""

import logging
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
import json
from openai import OpenAI

from app.config import settings
from app.modules.flowchart.models import (
    FlowchartOperationRequest,
    FlowchartOperationResponse,
    ErrorResponse,
)
from app.modules.flowchart.services.ai_tools import ALL_FLOWCHART_TOOLS
from app.modules.flowchart.services.operation_handler import flowchart_operation_handler
from app.modules.flowchart.utils.prompts import get_flowchart_system_prompt, build_flowchart_context_prompt
from app.services.common_operation_handler import ModuleConfig, execute_ai_operation
from app.services.langgraph_handler import execute_with_langgraph, execute_with_langgraph_stream, is_langgraph_enabled

logger = logging.getLogger(__name__)

router = APIRouter()

# Rate limiter instance
limiter = Limiter(key_func=get_remote_address)

# Module configuration for flowcharts (fallback if LangGraph not available)
FLOWCHART_CONFIG = ModuleConfig(
    module_name="flowchart",
    tools=ALL_FLOWCHART_TOOLS,
    operation_handler=flowchart_operation_handler,
    get_system_prompt=get_flowchart_system_prompt,
    build_context_prompt=build_flowchart_context_prompt,
    response_class=FlowchartOperationResponse,
    default_operation_type="none",
    no_tool_message="I couldn't understand the request. Please describe what flowchart you want to create.",
)


@router.post(
    "/operations",
    response_model=FlowchartOperationResponse,
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
        429: {"description": "Rate limit exceeded"},
    }
)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def execute_flowchart_operation(request: Request, body: FlowchartOperationRequest) -> FlowchartOperationResponse:
    """
    Execute an AI-powered flowchart operation with context awareness.

    Uses LangGraph multi-agent architecture for:
    - Automatic Mermaid syntax validation
    - Self-correction via reflection on errors
    - Up to 3 retry attempts for valid output

    This endpoint supports all flowchart operations:
    - generate: Create new flowchart from scratch
    - add: Add nodes/edges to existing flowchart
    - modify: Update flowchart content
    - delete: Remove elements
    - subgraph: Create swimlanes
    - expand: Detail a node into sub-steps
    - direction: Change flow direction
    - style: Apply visual styling

    The AI automatically selects the appropriate operation based on the user's
    natural language description and the current flowchart context.
    """
    # Build context dict from request
    context_dict = body.context.dict() if body.context else None

    # Build conversation history
    history = None
    if body.conversation_history:
        history = [{"role": msg.role, "content": msg.content} for msg in body.conversation_history]

    # Quick mode: always use single-shot for faster response
    if body.mode == "quick":
        logger.info("[Flowchart] Using single-shot (Quick mode)")
        return await execute_ai_operation(body, FLOWCHART_CONFIG)

    # Advanced mode: use LangGraph if available
    if is_langgraph_enabled():
        logger.info("[Flowchart] Using LangGraph multi-agent pipeline (Advanced mode)")

        # Execute with LangGraph
        result = await execute_with_langgraph(
            description=body.description,
            module_type="flowchart",
            context=context_dict,
            conversation_history=history,
            max_attempts=settings.DEFAULT_MAX_ATTEMPTS
        )

        return FlowchartOperationResponse(**result)

    # Fallback to original single-shot method
    logger.info("[Flowchart] LangGraph not available, using fallback")
    return await execute_ai_operation(body, FLOWCHART_CONFIG)


@router.post(
    "/fix-syntax",
    response_model=FlowchartOperationResponse,
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
        429: {"description": "Rate limit exceeded"},
    }
)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def fix_flowchart_syntax(request: Request, body: FlowchartOperationRequest) -> FlowchartOperationResponse:
    """
    Fix Mermaid syntax errors in a flowchart.

    Takes the current (broken) Mermaid code and the error message,
    then uses AI to correct the syntax while preserving the intent.
    """
    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    # Get the current code and error from context
    current_code = body.context.mermaidCode if body.context else ""
    error_message = body.description  # The error message is passed as description

    system_prompt = """You are a Mermaid.js syntax expert. Your ONLY task is to fix syntax errors in Mermaid flowchart code.

CRITICAL RULES:
1. PRESERVE the flowchart structure and meaning
2. Keep all nodes, edges, labels, and subgraphs
3. DO NOT simplify or replace the flowchart with a template

COMMON SYNTAX FIXES (apply what's needed):

1. EDGE LABEL SPACING: Remove spaces around pipes in edge labels
   - WRONG: -->| "Yes" |  or  -->| Yes |
   - CORRECT: -->|"Yes"| or -->|Yes|

2. RESERVED KEYWORDS: 'end', 'subgraph', 'graph', 'flowchart' cannot be used as node IDs
   - end → endNode or finish
   - Update ALL references to renamed nodes

3. SPECIAL CHARACTERS IN LABELS:
   - Wrap labels in double quotes: A["Label text"]
   - Replace parentheses with dashes: A["Data - GRIB2"] not A["Data (GRIB2)"]

4. NODE ID CHARACTERS: Use only alphanumeric and underscores
   - user-login → user_login

5. CLASS STATEMENT SPACING: Remove spaces after commas in class assignments
   - WRONG: class A, B, C className
   - CORRECT: class A,B,C className

6. INVALID EDGE SYNTAX: Use -->| not --| for labeled edges
   - WRONG: nodeA --|"Yes"| nodeB
   - CORRECT: nodeA -->|"Yes"| nodeB

OUTPUT: Return ONLY the corrected Mermaid code, no explanations or markdown."""

    user_prompt = f"""Fix the syntax error in this Mermaid flowchart.

SYNTAX ERROR: {error_message}

HINTS:
- If error mentions "got 'STR'" near edge labels: fix spacing like -->| "Yes" | → -->|"Yes"|
- If error mentions "got 'end'": rename node 'end' → 'endNode' and update all references
- If error mentions "got 'SPACE'" near class: remove spaces after commas like class A, B → class A,B
- If error mentions "Expecting 'LINK'" or "got 'STR'" near --|: change --| to -->| (invalid edge syntax)

ORIGINAL CODE:
{current_code}

Return the corrected Mermaid code only."""

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0,
        )

        fixed_code = response.choices[0].message.content.strip()

        # Remove markdown code blocks if present
        if fixed_code.startswith("```"):
            lines = fixed_code.split("\n")
            # Remove first line (```mermaid) and last line (```)
            fixed_code = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])

        return FlowchartOperationResponse(
            success=True,
            operation_type="fix_syntax",
            mermaid_code=fixed_code,
            message="Syntax errors have been fixed",
        )

    except Exception as e:
        logger.error(f"Failed to fix syntax: {e}", exc_info=True)
        return FlowchartOperationResponse(
            success=False,
            operation_type="fix_syntax",
            mermaid_code=current_code,
            message=f"Failed to fix syntax: {str(e)}",
        )


@router.post(
    "/operations/stream",
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
        429: {"description": "Rate limit exceeded"},
    }
)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def stream_flowchart_operation(request: Request, body: FlowchartOperationRequest):
    """
    Stream an AI-powered flowchart operation with progress updates.

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
        result = await execute_ai_operation(body, FLOWCHART_CONFIG)
        return StreamingResponse(
            iter([json.dumps({"type": "complete", "data": result.dict()}) + "\n"]),
            media_type="application/x-ndjson"
        )

    # Advanced mode with LangGraph streaming
    async def generate():
        async for update in execute_with_langgraph_stream(
            description=body.description,
            module_type="flowchart",
            context=context_dict,
            conversation_history=history,
            max_attempts=1
        ):
            yield json.dumps(update) + "\n"

    return StreamingResponse(generate(), media_type="application/x-ndjson")
