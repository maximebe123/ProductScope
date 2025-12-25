"""
Validator Agent Node

Routes to the appropriate validator based on module type.
Validates the generated output and returns validation errors.
"""

import logging
from typing import Any, Dict

from ..graph_state import GraphState, ValidationError
from ..validators import validate_mermaid, validate_diagram, validate_mindmap

logger = logging.getLogger(__name__)


async def validator_node(state: GraphState) -> Dict[str, Any]:
    """
    Validator Agent: Validates generated output based on module type.

    This node:
    1. Routes to the appropriate validator (mermaid, diagram, mindmap)
    2. Returns validation errors if any
    3. Sets is_valid flag
    4. Increments attempt_number

    Args:
        state: Current graph state

    Returns:
        Dict with validation_errors, is_valid, attempt_number
    """
    module_type = state["module_type"]
    tool_name = state.get("tool_name")
    tool_args = state.get("tool_arguments")
    generated_output = state.get("generated_output")
    current_attempt = state.get("attempt_number", 0)

    logger.info(f"[Validator] Validating {module_type} output, tool: {tool_name}")

    # If no tool call was made, nothing to validate
    if not tool_name:
        logger.info("[Validator] No tool call, skipping validation")
        return {
            "validation_errors": [],
            "is_valid": True,
            "attempt_number": current_attempt + 1
        }

    # Route to appropriate validator
    errors = []

    try:
        if module_type == "flowchart":
            # Validate Mermaid code
            if generated_output:
                errors = await validate_mermaid(generated_output)
            else:
                errors = [ValidationError(
                    error_type="schema",
                    message="No Mermaid code generated",
                    suggestion="Tool call must produce mermaid_code"
                )]

        elif module_type == "diagrams":
            # Validate diagram schema
            errors = await validate_diagram(tool_args)

        elif module_type == "mindmap":
            # Validate mindmap structure
            errors = await validate_mindmap(tool_args)

        else:
            logger.warning(f"[Validator] Unknown module type: {module_type}")
            errors = []

    except Exception as e:
        logger.error(f"[Validator] Validation error: {e}", exc_info=True)
        errors = [ValidationError(
            error_type="schema",
            message=f"Validation failed: {str(e)}",
            suggestion="Check the output format"
        )]

    is_valid = len(errors) == 0

    if is_valid:
        logger.info(f"[Validator] Output is valid")
    else:
        logger.warning(f"[Validator] Found {len(errors)} validation errors")
        for err in errors:
            logger.warning(f"  - {err}")

    return {
        "validation_errors": errors,
        "is_valid": is_valid,
        "attempt_number": current_attempt + 1
    }
