"""
Specialized Agents for Multi-Agent Diagram Generation

Each agent has a single responsibility and uses the appropriate model:
- GPT-5: Deep reasoning (Architect, Component, Reviewer)
- GPT-5-mini: Fast reasoning (Connection, Grouping)
- GPT-4o: Execution (Layout, Finalizer)
"""

from .architect import architect_agent
from .component import component_agent
from .connection import connection_agent
from .grouping import grouping_agent
from .layout import layout_agent
from .reviewer import reviewer_agent
from .finalizer import finalizer_agent

__all__ = [
    "architect_agent",
    "component_agent",
    "connection_agent",
    "grouping_agent",
    "layout_agent",
    "reviewer_agent",
    "finalizer_agent",
]
