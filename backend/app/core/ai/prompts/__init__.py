"""
Specialized prompts for each agent in the multi-agent workflow.

Each prompt is focused on a single responsibility (~50 lines max)
instead of the monolithic 276-line prompt.
"""

from .architect_prompt import ARCHITECT_PROMPT, get_architect_prompt
from .component_prompt import COMPONENT_PROMPT, get_component_prompt
from .connection_prompt import CONNECTION_PROMPT, get_connection_prompt
from .grouping_prompt import GROUPING_PROMPT, get_grouping_prompt
from .layout_prompt import LAYOUT_PROMPT, get_layout_prompt
from .reviewer_prompt import REVIEWER_PROMPT, get_reviewer_prompt
from .finalizer_prompt import FINALIZER_PROMPT, get_finalizer_prompt

# GitHub Import Prompts
from .code_analyzer_prompt import CODE_ANALYZER_PROMPT, get_code_analyzer_prompt
from .diagram_planner_prompt import DIAGRAM_PLANNER_PROMPT, get_diagram_planner_prompt

__all__ = [
    # Multi-agent workflow prompts
    "ARCHITECT_PROMPT",
    "COMPONENT_PROMPT",
    "CONNECTION_PROMPT",
    "GROUPING_PROMPT",
    "LAYOUT_PROMPT",
    "REVIEWER_PROMPT",
    "FINALIZER_PROMPT",
    "get_architect_prompt",
    "get_component_prompt",
    "get_connection_prompt",
    "get_grouping_prompt",
    "get_layout_prompt",
    "get_reviewer_prompt",
    "get_finalizer_prompt",
    # GitHub import prompts
    "CODE_ANALYZER_PROMPT",
    "DIAGRAM_PLANNER_PROMPT",
    "get_code_analyzer_prompt",
    "get_diagram_planner_prompt",
]
