"""
Planner Agent Node

Analyzes request complexity and creates execution plans for complex requests.
Simple requests pass through directly.
"""

import logging
import re
from typing import Any, Dict, List, Optional

from ..graph_state import GraphState

logger = logging.getLogger(__name__)

# Keywords that suggest multi-step operations
MULTI_STEP_KEYWORDS = [
    r'\bpuis\b',           # "then" in French
    r'\bensuite\b',        # "then/next" in French
    r'\bet\s+aussi\b',     # "and also"
    r'\baprès\b',          # "after"
    r'\bd\'abord\b',       # "first"
    r'\bfinalement\b',     # "finally"
    r'\bthen\b',           # English
    r'\bafter\s+that\b',
    r'\bfirst\b.*\bthen\b',
    r'\bstep\s*\d',        # "step 1", "step 2"
    r'\b\d+\.\s',          # Numbered list "1. ", "2. "
]

# Keywords suggesting style operations (should be separate step)
STYLE_KEYWORDS = [
    r'\bstyle\b',
    r'\bcouleur\b',
    r'\bcolor\b',
    r'\bhighlight\b',
    r'\bthème\b',
    r'\btheme\b',
]

# Minimum request length to consider for planning
MIN_COMPLEX_LENGTH = 200


def _is_complex_request(request: str) -> bool:
    """
    Determine if a request is complex enough to need planning.

    Complex requests:
    - Are long (>200 chars)
    - Contain multi-step keywords
    - Mix creation with styling
    """
    # Check length
    if len(request) < MIN_COMPLEX_LENGTH:
        return False

    request_lower = request.lower()

    # Check for multi-step keywords
    for pattern in MULTI_STEP_KEYWORDS:
        if re.search(pattern, request_lower):
            return True

    # Check if mixing content creation with styling
    has_style = any(re.search(p, request_lower) for p in STYLE_KEYWORDS)
    has_content = any(word in request_lower for word in [
        'create', 'add', 'crée', 'ajoute', 'génère', 'generate',
        'flowchart', 'diagram', 'mindmap'
    ])

    if has_style and has_content:
        return True

    return False


def _create_plan(request: str, module_type: str) -> List[str]:
    """
    Create a step-by-step plan for a complex request.

    Returns list of steps to execute.
    """
    steps = []
    request_lower = request.lower()

    # Check for numbered list in request
    numbered_items = re.findall(r'\d+\.\s*([^.\n]+)', request)
    if numbered_items:
        steps = [item.strip() for item in numbered_items]
        return steps

    # Check for "first...then" pattern
    first_match = re.search(r'd\'abord[,:]?\s*([^.]+)', request_lower)
    then_match = re.search(r'(?:puis|ensuite|then)[,:]?\s*([^.]+)', request_lower)

    if first_match:
        steps.append(first_match.group(1).strip())
    if then_match:
        steps.append(then_match.group(1).strip())

    # If still no steps, try to separate content and style
    if not steps:
        has_style = any(re.search(p, request_lower) for p in STYLE_KEYWORDS)

        if has_style:
            # Split into content creation and styling
            steps.append("Create the base structure/content")
            steps.append("Apply styling and visual formatting")
        else:
            # Just process as single step
            steps.append(request[:100] + "..." if len(request) > 100 else request)

    return steps


async def planner_node(state: GraphState) -> Dict[str, Any]:
    """
    Planner Agent: Analyzes complexity and creates execution plan.

    This node:
    1. Checks if the request is complex enough to need planning
    2. Creates a multi-step plan if needed
    3. Returns plan info to guide subsequent execution

    For simple requests, passes through without planning.

    Args:
        state: Current graph state

    Returns:
        Dict with current_plan and current_step
    """
    request = state["user_request"]
    module_type = state["module_type"]

    # Check if this is a complex request
    if not _is_complex_request(request):
        logger.info("[Planner] Simple request, no planning needed")
        return {
            "current_plan": None,
            "current_step": 0
        }

    # Create plan for complex request
    plan = _create_plan(request, module_type)

    logger.info(f"[Planner] Created plan with {len(plan)} steps:")
    for i, step in enumerate(plan, 1):
        logger.info(f"  Step {i}: {step[:50]}...")

    return {
        "current_plan": plan,
        "current_step": 0,
        "messages": [{
            "role": "system",
            "content": f"[Planner] Created {len(plan)}-step execution plan"
        }]
    }
