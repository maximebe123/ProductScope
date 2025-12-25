"""
Finalize Agent Node

Executes the validated tool call and builds the final response.
Uses existing operation handlers from each module.
Includes auto-fix for common Mermaid syntax errors.
"""

import logging
import re
from typing import Any, Dict, Optional

from ..graph_state import GraphState, ValidationError

logger = logging.getLogger(__name__)


# Reserved keywords that cannot be used as node IDs
RESERVED_KEYWORDS = {'end', 'subgraph', 'graph', 'flowchart', 'direction', 'click', 'style', 'classDef', 'class', 'linkStyle'}


def _autofix_reserved_keywords(code: str) -> str:
    """
    Auto-fix reserved keywords used as node IDs.

    'end' is the most common - LLMs love naming terminal nodes 'end',
    but it's reserved for closing subgraphs in Mermaid.
    """
    if not code:
        return code

    # Find all node IDs that are reserved keywords
    # Pattern matches: end[...], end(...), end{...}, A --> end, etc.
    node_def_pattern = re.compile(r'\b(end|subgraph|graph|flowchart)\s*[\[\(\{]', re.IGNORECASE)
    edge_target_pattern = re.compile(r'(-->|---|-\.->|==>|--o|--x|<-->)\s*(?:\|[^|]*\|)?\s*(end|subgraph|graph|flowchart)\b', re.IGNORECASE)
    class_pattern = re.compile(r'\bclass\s+([^;{}\n]+)', re.IGNORECASE)

    # Check if 'end' is used as a node ID (not the subgraph closer)
    has_end_node = bool(node_def_pattern.search(code)) or bool(re.search(r'-->\s*(?:\|[^|]*\|)?\s*end\b', code, re.IGNORECASE))

    if not has_end_node:
        return code

    # Replace 'end' as node ID with 'endNode'
    fixed = code

    # Fix node definitions: end[...] -> endNode[...]
    fixed = re.sub(r'\bend\s*([\[\(\{])', r'endNode\1', fixed, flags=re.IGNORECASE)

    # Fix edge targets: A --> end -> A --> endNode (but not when 'end' is alone on a line)
    fixed = re.sub(r'(-->|---|-\.->|==>|--o|--x|<-->)\s*(\|[^|]*\|)?\s*end\b(?!\s*[\[\(\{])', r'\1\2endNode', fixed, flags=re.IGNORECASE)

    # Fix edge sources: end --> A -> endNode --> A
    fixed = re.sub(r'\bend\s*(-->|---|-\.->|==>|--o|--x|<-->)', r'endNode\1', fixed, flags=re.IGNORECASE)

    # Fix class assignments: class start,end -> class start,endNode
    def fix_class_assignment(match):
        class_list = match.group(1)
        # Replace 'end' but not inside other words
        fixed_list = re.sub(r'\bend\b', 'endNode', class_list, flags=re.IGNORECASE)
        return f'class {fixed_list}'

    fixed = re.sub(r'\bclass\s+([^;{}\n]+)', fix_class_assignment, fixed)

    if fixed != code:
        logger.info("[Finalize] Auto-fixed reserved keyword 'end' -> 'endNode'")

    return fixed


def _autofix_edge_labels(code: str) -> str:
    """
    Fix edge label spacing issues.

    LLMs often generate `-->| "Yes" |` instead of `-->|"Yes"|`
    The extra spaces cause parse errors.
    """
    if not code:
        return code

    # Fix: -->| "text" | -> -->|"text"|
    # Pattern matches arrows with improperly spaced labels
    fixed = re.sub(
        r'(-->|---|-\.->|==>|--o|--x|<-->)\s*\|\s*"([^"]+)"\s*\|',
        r'\1|"\2"|',
        code
    )

    # Also fix: -->| text | -> -->|text| (unquoted labels)
    fixed = re.sub(
        r'(-->|---|-\.->|==>|--o|--x|<-->)\s*\|\s*([^"|]+?)\s*\|',
        r'\1|\2|',
        fixed
    )

    if fixed != code:
        logger.info("[Finalize] Auto-fixed edge label spacing")

    return fixed


def _autofix_class_statements(code: str) -> str:
    """
    Fix class assignment spacing issues.

    LLMs often generate `class A, B, C className` instead of `class A,B,C className`
    The spaces after commas cause parse errors.
    """
    if not code:
        return code

    lines = code.split('\n')
    fixed_lines = []

    for line in lines:
        stripped = line.strip()

        # Only fix class statements
        if stripped.startswith('class '):
            # Remove spaces after commas in the node list (before the class name)
            # Pattern: class nodeA, nodeB, nodeC className
            # Result: class nodeA,nodeB,nodeC className
            fixed_line = re.sub(r',\s+', ',', line)
            fixed_lines.append(fixed_line)
        else:
            fixed_lines.append(line)

    result = '\n'.join(fixed_lines)

    if result != code:
        logger.info("[Finalize] Auto-fixed class statement spacing")

    return result


def _autofix_invalid_edge_syntax(code: str) -> str:
    """
    Fix invalid edge syntax: --|"label"| -> -->|"label"|

    LLMs sometimes generate --|"Yes"| instead of -->|"Yes"|
    The '--|' is not a valid edge type in Mermaid.
    """
    if not code:
        return code

    # Fix: --|"label"| -> -->|"label"|
    # Pattern matches: nodeA --|"label"| or nodeA --|label|
    fixed = re.sub(
        r'(\s)--\|',
        r'\1-->|',
        code
    )

    if fixed != code:
        logger.info("[Finalize] Auto-fixed invalid edge syntax '--|' -> '-->|'")

    return fixed


def _autofix_mermaid_code(code: str) -> str:
    """
    Auto-fix common Mermaid syntax errors that LLMs make.

    Fixes:
    - Reserved keywords as node IDs (e.g., 'end' -> 'endNode')
    - Invalid edge syntax: --|"label"| -> -->|"label"|
    - Edge label spacing: -->| "Yes" | -> -->|"Yes"|
    - Class statement spacing: class A, B className -> class A,B className
    - Missing closing quotes: A["Start] -> A["Start"]
    - Missing opening quotes: A[Start"] -> A["Start"]
    - Parentheses inside labels: A["Data (GRIB2)"] -> A["Data - GRIB2"]
    - Nested quotes: A["Say "Hello""] -> A["Say Hello"]
    """
    if not code:
        return code

    # First fix reserved keywords
    code = _autofix_reserved_keywords(code)

    # Fix invalid edge syntax (--|) before other edge fixes
    code = _autofix_invalid_edge_syntax(code)

    # Fix edge label spacing
    code = _autofix_edge_labels(code)

    # Fix class statement spacing
    code = _autofix_class_statements(code)

    lines = code.split('\n')
    fixed_lines = []

    for line in lines:
        fixed_line = line

        # Skip non-node lines
        stripped = line.strip()
        if not stripped or stripped.startswith('%%') or stripped.startswith('flowchart') or stripped.startswith('graph'):
            fixed_lines.append(line)
            continue
        if stripped.startswith('subgraph') or stripped == 'end':
            fixed_lines.append(line)
            continue
        if stripped.startswith('style') or stripped.startswith('classDef') or stripped.startswith('class'):
            fixed_lines.append(line)
            continue
        if stripped.startswith('linkStyle'):
            fixed_lines.append(line)
            continue

        # Fix 1: Missing closing quote in ["text] -> ["text"]
        # Pattern: [" followed by text and ] without closing "
        fixed_line = re.sub(r'\["([^"\]]+)\]', r'["\1"]', fixed_line)

        # Fix 2: Missing opening quote in [text"] -> ["text"]
        fixed_line = re.sub(r'\[([^"\[\]]+)"\]', r'["\1"]', fixed_line)

        # Fix 3: Stadium shape (["text]) -> (["text"])
        fixed_line = re.sub(r'\(\["([^"\]]+)\]\)', r'(["\1"])', fixed_line)
        fixed_line = re.sub(r'\(\[([^"\[\]]+)"\]\)', r'(["\1"])', fixed_line)

        # Fix 4: Diamond shape {"text} -> {"text"}
        fixed_line = re.sub(r'\{"([^"\}]+)\}', r'{"\1"}', fixed_line)
        fixed_line = re.sub(r'\{([^"\{\}]+)"\}', r'{"\1"}', fixed_line)

        # Fix 5: Parentheses inside labels ["Data (info)"] -> ["Data - info"]
        def fix_parens_in_label(match):
            quote_start = match.group(1)
            content = match.group(2)
            quote_end = match.group(3)
            # Replace (xxx) with - xxx
            fixed = re.sub(r'\s*\(([^)]+)\)', r' - \1', content)
            # Clean up
            fixed = fixed.strip()
            return f'{quote_start}{fixed}{quote_end}'

        fixed_line = re.sub(r'(\[")([^"]*\([^)]+\)[^"]*)("\])', fix_parens_in_label, fixed_line)
        fixed_line = re.sub(r'(\(\[")([^"]*\([^)]+\)[^"]*)("\]\))', fix_parens_in_label, fixed_line)
        fixed_line = re.sub(r'(\{")([^"]*\([^)]+\)[^"]*)("\})', fix_parens_in_label, fixed_line)

        fixed_lines.append(fixed_line)

    result = '\n'.join(fixed_lines)

    if result != code:
        logger.info("[Finalize] Auto-fixed Mermaid syntax errors")

    return result


def _get_operation_handler(module_type: str):
    """Get the operation handler for the module type."""
    if module_type == "flowchart":
        from app.modules.flowchart.services.operation_handler import flowchart_operation_handler
        return flowchart_operation_handler
    elif module_type == "diagrams":
        from app.services.operation_handler import operation_handler
        return operation_handler
    elif module_type == "mindmap":
        from app.modules.mindmap.services.operation_handler import mindmap_operation_handler
        return mindmap_operation_handler
    else:
        raise ValueError(f"Unknown module type: {module_type}")


def _build_context_object(module_type: str, context: Optional[dict]):
    """Build the context object for the module type."""
    if not context:
        return None

    if module_type == "flowchart":
        from app.modules.flowchart.models import FlowchartContext
        return FlowchartContext(**context)
    elif module_type == "diagrams":
        from app.models.operations import DiagramContext
        return DiagramContext(**context)
    elif module_type == "mindmap":
        from app.modules.mindmap.models import MindMapContext
        return MindMapContext(**context)

    return context


async def finalize_node(state: GraphState) -> Dict[str, Any]:
    """
    Finalize Agent: Executes tool call and builds response.

    This node:
    1. Uses existing operation handlers to execute the tool call
    2. Builds the final response
    3. Sets success/failure status

    Args:
        state: Current graph state

    Returns:
        Dict with final_response, status, warnings
    """
    module_type = state["module_type"]
    tool_name = state.get("tool_name")
    tool_args = state.get("tool_arguments")
    context = state.get("context")
    validation_errors = state.get("validation_errors", [])
    is_valid = state.get("is_valid", True)
    attempt_number = state.get("attempt_number", 1)
    max_attempts = state.get("max_attempts", 3)

    logger.info(
        f"[Finalize] Module: {module_type}, Tool: {tool_name}, "
        f"Valid: {is_valid}, Attempts: {attempt_number}/{max_attempts}"
    )

    # If no tool call, return text response
    if not tool_name:
        text_response = state.get("generated_output") or "No response generated"
        logger.info("[Finalize] No tool call, returning text response")

        # Build response matching module's expected format
        return {
            "final_response": _build_text_response(module_type, text_response),
            "status": "success",
            "warnings": []
        }

    # Build warnings for validation issues
    warnings = []
    if not is_valid:
        warnings.append(f"Output had validation errors after {attempt_number} attempts")
        for err in validation_errors[:3]:  # Limit to first 3
            warnings.append(str(err))

    # Auto-fix Mermaid syntax errors for flowchart module
    if module_type == "flowchart" and tool_args:
        if "mermaid_code" in tool_args and tool_args["mermaid_code"]:
            original_code = tool_args["mermaid_code"]
            tool_args["mermaid_code"] = _autofix_mermaid_code(original_code)
            if tool_args["mermaid_code"] != original_code:
                warnings.append("Auto-fixed syntax errors in Mermaid code")

    # Execute via existing operation handler
    try:
        handler = _get_operation_handler(module_type)
        context_obj = _build_context_object(module_type, context)

        result = handler.handle_tool_call(
            tool_name=tool_name,
            arguments=tool_args,
            context=context_obj
        )

        logger.info(f"[Finalize] Handler returned: {result.operation_type}")

        # Convert to dict and add warnings
        response_dict = result.dict() if hasattr(result, 'dict') else result
        if warnings:
            response_dict["warnings"] = warnings

        return {
            "final_response": response_dict,
            "status": "success" if result.success else "failed",
            "warnings": warnings
        }

    except Exception as e:
        logger.error(f"[Finalize] Handler error: {e}", exc_info=True)

        return {
            "final_response": _build_error_response(module_type, str(e)),
            "status": "failed",
            "warnings": warnings + [str(e)]
        }


def _build_text_response(module_type: str, text: str) -> dict:
    """Build a text-only response for the module type."""
    if module_type == "flowchart":
        # Flowchart has "none" as valid operation type for text responses
        return {
            "success": True,
            "operation_type": "none",
            "message": text,
            "mermaid_code": None,
            "code_to_append": None,
            "lines_to_remove": []
        }
    elif module_type == "diagrams":
        # Diagrams needs valid operation type - use "generate" with empty diagram
        return {
            "success": True,
            "operation_type": "generate",
            "message": text,
            "diagram": None,
            "nodes_to_add": [],
            "nodes_to_modify": [],
            "nodes_to_delete": [],
            "edges_to_add": [],
            "edges_to_modify": [],
            "edges_to_delete": [],
            "groups_to_create": []
        }
    elif module_type == "mindmap":
        # Mindmap text response
        return {
            "success": True,
            "operation_type": "none",
            "message": text
        }

    return {"success": True, "message": text}


def _build_error_response(module_type: str, error: str) -> dict:
    """Build an error response for the module type."""
    if module_type == "diagrams":
        return {
            "success": False,
            "operation_type": "generate",
            "message": f"Error executing operation: {error}",
            "diagram": None,
            "nodes_to_add": [],
            "nodes_to_modify": [],
            "nodes_to_delete": [],
            "edges_to_add": [],
            "edges_to_modify": [],
            "edges_to_delete": [],
            "groups_to_create": []
        }
    return {
        "success": False,
        "operation_type": "none",
        "message": f"Error executing operation: {error}"
    }


async def finalize_with_warning_node(state: GraphState) -> Dict[str, Any]:
    """
    Finalize with warning: Used when max retries reached without valid output.

    Still attempts to execute, but adds prominent warnings.
    """
    logger.warning(
        f"[Finalize] Max attempts reached, proceeding with potentially invalid output"
    )

    # Add warning about validation failure
    state_copy = dict(state)
    existing_warnings = list(state_copy.get("warnings", []))
    existing_warnings.insert(0, "Maximum retry attempts reached - output may have issues")

    state_copy["warnings"] = existing_warnings

    # Delegate to normal finalize
    result = await finalize_node(state_copy)

    # Ensure warning is in result
    if "warnings" not in result:
        result["warnings"] = []
    if "Maximum retry attempts reached" not in str(result.get("warnings", [])):
        result["warnings"].insert(0, "Maximum retry attempts reached - output may have issues")

    return result
