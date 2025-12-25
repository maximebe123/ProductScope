"""
Mermaid Flowchart Validator

Validates Mermaid flowchart syntax using:
1. Fast regex checks for common LLM errors
2. mmdc CLI for full syntax validation (if available)
"""

import asyncio
import re
import tempfile
import logging
from typing import List, Tuple
from pathlib import Path

from ..graph_state import ValidationError

logger = logging.getLogger(__name__)


# Common LLM mistakes - regex patterns with error messages and suggestions
SYNTAX_ERROR_PATTERNS: List[Tuple[str, str, str]] = [
    # Invalid edge syntax: --|"label"| instead of -->|"label"| (very common LLM error)
    (
        r'[A-Za-z_][A-Za-z0-9_]*\s+--\|',
        "Invalid edge syntax: '--|' is not valid, use '-->|' for arrows with labels",
        "Change --|\"label\"| to -->|\"label\"| - the arrow needs two dashes and a greater-than sign"
    ),
    # Edge labels with extra spaces (very common LLM error)
    (
        r'-->\s*\|\s+"[^"]+"\s+\|',
        "Edge label has extra spaces around pipes",
        "Remove spaces: -->|\"Yes\"| instead of -->| \"Yes\" |"
    ),
    # Class assignments with spaces after commas (common LLM error)
    (
        r'^class\s+[A-Za-z_][A-Za-z0-9_]*,\s+',
        "Class assignment has spaces after commas",
        "Remove spaces after commas: 'class A,B,C className' instead of 'class A, B, C className'"
    ),
    # Parentheses inside labels (most common error)
    (
        r'\[([^\]]*)\(([^)]+)\)([^\]]*)\]',
        "Parentheses inside label will cause parse error",
        "Replace parentheses with dashes, e.g., 'Data - GRIB2' instead of 'Data (GRIB2)'"
    ),
    # Nested brackets in labels
    (
        r'\[([^\]]*)\[([^\]]+)\]([^\]]*)\]',
        "Nested brackets inside label will cause parse error",
        "Remove inner brackets or use dashes"
    ),
    # Quotes inside quoted labels
    (
        r'"([^"]*)"([^"]*)"',
        "Quotes inside label will cause parse error",
        "Remove inner quotes or use apostrophes"
    ),
    # Stadium shape with parentheses in label
    (
        r'\(\[([^\]]*)\(([^)]+)\)([^\]]*)\]\)',
        "Parentheses inside stadium shape label will cause parse error",
        "Use rectangle shape with quotes instead: A[\"Label - info\"]"
    ),
    # Diamond shape with parentheses
    (
        r'\{([^}]*)\(([^)]+)\)([^}]*)\}',
        "Parentheses inside diamond label will cause parse error",
        "Replace parentheses with dashes in decision labels"
    ),
    # Cylinder shape with parentheses
    (
        r'\[\(([^)]*)\(([^)]+)\)([^)]*)\)\]',
        "Parentheses inside cylinder label will cause parse error",
        "Replace parentheses with dashes in database labels"
    ),
    # Unquoted labels with special chars (less strict, just a warning)
    (
        r'\[([A-Za-z][^"\[\]]*[:/\-][^"\[\]]*)\]',
        None,  # Not an error, but recommend quotes
        None
    ),
]

# Patterns for labels that SHOULD have quotes
QUOTE_RECOMMENDED_PATTERN = re.compile(
    r'([A-Za-z_][A-Za-z0-9_]*)\s*\[([^"\[\]]+)\]',
    re.MULTILINE
)

# Reserved keywords that cannot be used as node IDs in Mermaid
RESERVED_KEYWORDS = {
    'end',        # Closes subgraphs
    'subgraph',   # Opens subgraphs
    'graph',      # Graph declaration
    'flowchart',  # Flowchart declaration
    'direction',  # Direction directive
    'click',      # Click interaction
    'style',      # Style directive
    'classDef',   # Class definition
    'class',      # Class assignment
    'linkStyle',  # Link styling
}


async def validate_mermaid(code: str) -> List[ValidationError]:
    """
    Validate Mermaid flowchart code.

    Args:
        code: Mermaid flowchart code to validate

    Returns:
        List of ValidationError objects (empty if valid)
    """
    if not code or not code.strip():
        return [ValidationError(
            error_type="syntax",
            message="Empty Mermaid code provided",
            suggestion="Provide valid Mermaid flowchart code starting with 'flowchart TB' or similar"
        )]

    errors: List[ValidationError] = []

    # Step 1: Check for reserved keywords used as node IDs (most common LLM error)
    keyword_errors = _check_reserved_keywords(code)
    errors.extend(keyword_errors)

    # Step 2: Check for class statement syntax errors
    class_errors = _check_class_statements(code)
    errors.extend(class_errors)

    # Step 3: Fast regex checks for common LLM errors
    regex_errors = _check_regex_patterns(code)
    errors.extend(regex_errors)

    # Step 4: If no obvious errors, try mmdc validation
    if not errors:
        mmdc_errors = await _validate_with_mmdc(code)
        errors.extend(mmdc_errors)

    return errors


def _check_reserved_keywords(code: str) -> List[ValidationError]:
    """
    Check for reserved keywords used as node IDs.

    'end' is the most common culprit - LLMs love to use it for terminal nodes,
    but it's reserved for closing subgraphs in Mermaid.
    """
    errors: List[ValidationError] = []
    lines = code.split('\n')

    # Pattern to match node definitions: nodeId[...] or nodeId(...) or nodeId{...}
    node_def_pattern = re.compile(r'^(\s*)([A-Za-z_][A-Za-z0-9_]*)\s*[\[\(\{]')

    # Pattern to match edge definitions: A --> B or A -->|label| B
    edge_pattern = re.compile(r'([A-Za-z_][A-Za-z0-9_]*)\s*(?:-->|---|-\.->|==>|--o|--x|<-->)')
    edge_target_pattern = re.compile(r'(?:-->|---|-\.->|==>|--o|--x|<-->)\s*(?:\|[^|]*\|)?\s*([A-Za-z_][A-Za-z0-9_]*)')

    for line_num, line in enumerate(lines, 1):
        trimmed = line.strip()

        # Skip comments, declarations, directives
        if not trimmed or trimmed.startswith('%%'):
            continue
        if trimmed.startswith('flowchart') or trimmed.startswith('graph'):
            continue
        if trimmed.startswith('subgraph') or trimmed == 'end':
            continue
        if trimmed.startswith('style') or trimmed.startswith('classDef'):
            continue
        if trimmed.startswith('class ') or trimmed.startswith('linkStyle'):
            continue

        # Check node definitions
        node_match = node_def_pattern.match(trimmed)
        if node_match:
            node_id = node_match.group(2).lower()
            if node_id in RESERVED_KEYWORDS:
                errors.append(ValidationError(
                    error_type="syntax",
                    message=f"'{node_match.group(2)}' is a reserved keyword and cannot be used as a node ID",
                    line_number=line_num,
                    suggestion=f"Rename the node to '{node_match.group(2)}Node' or 'finish' instead"
                ))

        # Check edge sources and targets
        for match in edge_pattern.finditer(trimmed):
            node_id = match.group(1).lower()
            if node_id in RESERVED_KEYWORDS:
                errors.append(ValidationError(
                    error_type="syntax",
                    message=f"'{match.group(1)}' is a reserved keyword used in edge definition",
                    line_number=line_num,
                    suggestion=f"Rename the node to '{match.group(1)}Node' and update all references"
                ))

        for match in edge_target_pattern.finditer(trimmed):
            node_id = match.group(1).lower()
            if node_id in RESERVED_KEYWORDS:
                errors.append(ValidationError(
                    error_type="syntax",
                    message=f"'{match.group(1)}' is a reserved keyword used as edge target",
                    line_number=line_num,
                    suggestion=f"Rename the node to '{match.group(1)}Node' and update all references"
                ))

    return errors


def _check_class_statements(code: str) -> List[ValidationError]:
    """
    Check for syntax errors in class assignment statements.

    Common LLM error: adding spaces after commas in node lists.
    - Wrong: class A, B, C className
    - Correct: class A,B,C className
    """
    errors: List[ValidationError] = []
    lines = code.split('\n')

    # Pattern to detect class statements with spaces after commas
    class_space_pattern = re.compile(r'^class\s+.*,\s+')

    for line_num, line in enumerate(lines, 1):
        trimmed = line.strip()

        # Only check class statements
        if not trimmed.startswith('class '):
            continue

        # Check for spaces after commas
        if class_space_pattern.match(trimmed):
            errors.append(ValidationError(
                error_type="syntax",
                message="Class assignment has spaces after commas",
                line_number=line_num,
                suggestion="Remove spaces after commas: 'class A,B,C className' instead of 'class A, B, C className'"
            ))

    return errors


def _check_regex_patterns(code: str) -> List[ValidationError]:
    """
    Check for common syntax errors using regex patterns.

    This catches the most frequent LLM mistakes without needing
    to invoke the external mmdc CLI.
    """
    errors: List[ValidationError] = []
    lines = code.split('\n')

    for line_num, line in enumerate(lines, 1):
        trimmed = line.strip()

        # Skip non-node lines
        if not trimmed or trimmed.startswith('%%') or trimmed.startswith('flowchart') or trimmed.startswith('graph'):
            continue
        if trimmed.startswith('subgraph') or trimmed == 'end':
            continue
        if trimmed.startswith('style') or trimmed.startswith('classDef') or trimmed.startswith('class'):
            continue
        if trimmed.startswith('linkStyle'):
            continue

        # Check each error pattern
        for pattern, message, suggestion in SYNTAX_ERROR_PATTERNS:
            if message is None:  # Skip informational patterns
                continue

            if re.search(pattern, trimmed):
                errors.append(ValidationError(
                    error_type="syntax",
                    message=message,
                    line_number=line_num,
                    suggestion=suggestion
                ))
                break  # One error per line is enough

    return errors


async def _validate_with_mmdc(code: str) -> List[ValidationError]:
    """
    Validate using mermaid-cli (mmdc) for complete syntax checking.

    Falls back gracefully if mmdc is not installed.
    """
    errors: List[ValidationError] = []

    try:
        # Create temp file with mermaid code
        with tempfile.NamedTemporaryFile(
            mode='w',
            suffix='.mmd',
            delete=False,
            encoding='utf-8'
        ) as f:
            f.write(code)
            temp_path = f.name

        try:
            # Run mmdc with parse-only flag
            process = await asyncio.create_subprocess_exec(
                'mmdc',
                '-i', temp_path,
                '-o', '/dev/null',
                '--parseOnly',
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=10.0  # 10 second timeout
            )

            if process.returncode != 0:
                error_text = stderr.decode('utf-8') or stdout.decode('utf-8')
                error_info = _parse_mmdc_error(error_text)
                errors.append(error_info)

        except asyncio.TimeoutError:
            logger.warning("mmdc validation timed out")
        finally:
            # Clean up temp file
            Path(temp_path).unlink(missing_ok=True)

    except FileNotFoundError:
        # mmdc not installed - fall back to regex-only validation
        logger.debug("mmdc not found, using regex-only validation")

    except Exception as e:
        logger.warning(f"mmdc validation failed: {e}")

    return errors


def _parse_mmdc_error(error_text: str) -> ValidationError:
    """
    Parse mmdc CLI error output into a structured ValidationError.
    """
    # Common mmdc error patterns
    # Example: "Parse error on line 2:"
    line_match = re.search(r'line\s+(\d+)', error_text, re.IGNORECASE)
    line_number = int(line_match.group(1)) if line_match else None

    # Extract the main error message
    # mmdc outputs things like: "Expecting 'SQE', 'DOUBLECIRCLEEND', ..."
    expecting_match = re.search(r"Expecting\s+'([^']+)'", error_text)

    if expecting_match:
        message = f"Syntax error: unexpected token. {error_text.split('^')[0].strip()[-50:]}"
    else:
        # Use first line of error as message
        message = error_text.split('\n')[0][:200]

    return ValidationError(
        error_type="syntax",
        message=message,
        line_number=line_number,
        suggestion="Check for special characters (parentheses, brackets, quotes) in labels. "
                   "Wrap labels in double quotes and avoid (), [], {} inside labels."
    )


def check_mermaid_quick(code: str) -> bool:
    """
    Quick synchronous check if Mermaid code is likely valid.

    This is a fast pre-check that doesn't invoke mmdc.
    Returns True if no obvious errors found.
    """
    errors = _check_regex_patterns(code)
    return len(errors) == 0
