"""
Graph State Definition for LangGraph Multi-Agent Architecture

Defines the shared state that flows through all agents in the graph.
"""

from typing import TypedDict, Annotated, List, Optional, Literal, Any
from pydantic import BaseModel
import operator


class ValidationError(BaseModel):
    """Structured validation error returned by validators"""
    error_type: Literal["syntax", "schema", "semantic"]
    message: str
    line_number: Optional[int] = None
    suggestion: Optional[str] = None

    def __str__(self) -> str:
        result = f"[{self.error_type.upper()}] {self.message}"
        if self.line_number:
            result += f" (line {self.line_number})"
        if self.suggestion:
            result += f"\n  Suggestion: {self.suggestion}"
        return result


class GraphState(TypedDict):
    """
    Shared state for the LangGraph multi-agent workflow.

    This state flows through all nodes (agents) and accumulates
    information as the request is processed.
    """

    # === Input ===
    user_request: str  # Original user description
    module_type: Literal["flowchart", "diagrams", "mindmap"]
    context: Optional[dict]  # Current diagram/flowchart state
    conversation_history: List[dict]  # Previous messages

    # === Processing ===
    # Messages accumulate across the graph using operator.add
    messages: Annotated[List[dict], operator.add]

    # Multi-step planning (optional)
    current_plan: Optional[List[str]]  # List of steps to execute
    current_step: int  # Current step index

    # === Output from Generator ===
    tool_name: Optional[str]  # Tool selected by LLM
    tool_arguments: Optional[dict]  # Arguments for the tool
    generated_output: Optional[str]  # Raw output (Mermaid code, etc.)

    # === Validation ===
    validation_errors: List[ValidationError]
    is_valid: bool

    # === Retry Control ===
    attempt_number: int
    max_attempts: int  # Default: 3
    reflection_feedback: Optional[str]  # Feedback from Reflection agent

    # === Final Result ===
    final_response: Optional[dict]  # Response to return to client
    status: Literal["pending", "success", "failed"]
    warnings: List[str]  # Non-fatal warnings


def create_initial_state(
    user_request: str,
    module_type: Literal["flowchart", "diagrams", "mindmap"],
    context: Optional[dict] = None,
    conversation_history: Optional[List[dict]] = None,
    max_attempts: int = 3
) -> GraphState:
    """
    Create the initial state for a new graph execution.

    Args:
        user_request: The user's natural language request
        module_type: Which module to use (flowchart, diagrams, mindmap)
        context: Current state of the diagram/flowchart
        conversation_history: Previous conversation messages
        max_attempts: Maximum retry attempts for validation

    Returns:
        Initial GraphState ready for graph.ainvoke()
    """
    return GraphState(
        # Input
        user_request=user_request,
        module_type=module_type,
        context=context,
        conversation_history=conversation_history or [],

        # Processing
        messages=[],
        current_plan=None,
        current_step=0,

        # Output
        tool_name=None,
        tool_arguments=None,
        generated_output=None,

        # Validation
        validation_errors=[],
        is_valid=False,

        # Retry
        attempt_number=0,
        max_attempts=max_attempts,
        reflection_feedback=None,

        # Result
        final_response=None,
        status="pending",
        warnings=[],
    )
