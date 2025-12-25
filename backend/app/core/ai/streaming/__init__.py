"""
Streaming Pipeline Infrastructure

Provides base classes and utilities for building multi-agent streaming pipelines.
"""

from .base import (
    AgentConfig,
    StreamEvent,
    create_agent_start_event,
    create_agent_complete_event,
    create_error_event,
    create_progress_event,
    calculate_progress,
    handle_stream_events,
)

__all__ = [
    "AgentConfig",
    "StreamEvent",
    "create_agent_start_event",
    "create_agent_complete_event",
    "create_error_event",
    "create_progress_event",
    "calculate_progress",
    "handle_stream_events",
]
