"""
Reflection Agent Node

Analyzes validation errors and generates corrective feedback
for the next Generator attempt.
"""

import logging
from typing import Any, Dict, List

from openai import AsyncOpenAI

from app.config import settings
from ..graph_state import GraphState, ValidationError

logger = logging.getLogger(__name__)

# Lazy-loaded OpenAI client
_client = None


def get_openai_client() -> AsyncOpenAI:
    """Get or create OpenAI client singleton."""
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


def _format_errors(errors: List[ValidationError]) -> str:
    """Format validation errors for the reflection prompt."""
    lines = []
    for i, err in enumerate(errors, 1):
        line = f"{i}. [{err.error_type.upper()}] {err.message}"
        if err.line_number:
            line += f" (line {err.line_number})"
        if err.suggestion:
            line += f"\n   Suggestion: {err.suggestion}"
        lines.append(line)
    return "\n".join(lines)


def _get_module_rules(module_type: str) -> str:
    """Get module-specific syntax rules to include in reflection."""
    if module_type == "flowchart":
        return """
## Mermaid Flowchart Critical Rules

1. ALWAYS wrap ALL labels in double quotes: ["Label"], (["Label"]), {"Label"}
2. NEVER use parentheses () inside labels - replace with dashes or remove
3. NEVER use quotes inside labels - remove inner quotes
4. NEVER use brackets [] or braces {} inside labels

Examples of CORRECT syntax:
- A["Process Data"]
- B(["Start"])
- C{"Decision?"}
- D["Data Source - GRIB2"]  (NOT "Data Source (GRIB2)")
- E["Worker Vectorize"]  (NOT "Worker \"Vectorize\"")
"""
    elif module_type == "diagrams":
        return """
## Diagram Schema Rules

1. Every node must have: id (unique string), label (string), type (valid node type)
2. Every edge must have: source (existing node id), target (existing node id)
3. Positions (x, y) must be numbers if provided
4. Valid node types: server, database, cache, api, etc.
"""
    elif module_type == "mindmap":
        return """
## Mindmap Structure Rules

1. Must have a root node with 'topic' field
2. Children must be arrays of node objects
3. Each node needs 'id' and 'topic' fields
4. Maximum depth is 10 levels
"""
    return ""


async def reflection_node(state: GraphState) -> Dict[str, Any]:
    """
    Reflection Agent: Analyzes errors and generates corrective feedback.

    This node:
    1. Formats validation errors into a clear problem statement
    2. Calls LLM to analyze and suggest fixes
    3. Returns feedback for the next Generator attempt

    Args:
        state: Current graph state

    Returns:
        Dict with reflection_feedback and messages
    """
    module_type = state["module_type"]
    errors = state.get("validation_errors", [])
    generated_output = state.get("generated_output", "")
    attempt = state.get("attempt_number", 1)

    logger.info(f"[Reflection] Analyzing {len(errors)} errors, attempt {attempt}")

    if not errors:
        return {
            "reflection_feedback": None,
            "messages": []
        }

    # Build reflection prompt
    error_text = _format_errors(errors)
    module_rules = _get_module_rules(module_type)

    # Truncate output if too long
    output_preview = generated_output[:2000] if generated_output else "(no output)"
    if len(generated_output) > 2000:
        output_preview += "\n... (truncated)"

    reflection_prompt = f"""Your previous response generated invalid output with the following errors:

## Validation Errors
{error_text}

## Your Previous Output
```
{output_preview}
```

{module_rules}

## Your Task
Analyze these errors and provide:
1. What specific rules were violated
2. The exact fixes needed (show before/after for each error)
3. A corrected version of the problematic parts

Be specific and actionable. Focus on the syntax errors."""

    # Call LLM for reflection (with lower temperature for focused analysis)
    client = get_openai_client()

    try:
        response = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You are a code reviewer specializing in diagram syntax. "
                               "Analyze errors and provide specific, actionable fixes."
                },
                {"role": "user", "content": reflection_prompt}
            ],
            temperature=0.3,  # Low temperature for focused, consistent feedback
            max_tokens=1500,
        )

        feedback = response.choices[0].message.content

        logger.info(f"[Reflection] Generated feedback ({len(feedback)} chars)")

        return {
            "reflection_feedback": feedback,
            "messages": [{
                "role": "system",
                "content": f"[Reflection] Error analysis complete"
            }]
        }

    except Exception as e:
        logger.error(f"[Reflection] Error: {e}", exc_info=True)

        # Fallback: use error messages directly as feedback
        fallback_feedback = f"""Fix these errors in your next attempt:

{error_text}

{module_rules}"""

        return {
            "reflection_feedback": fallback_feedback,
            "messages": [{
                "role": "system",
                "content": f"[Reflection] Using fallback feedback"
            }]
        }
