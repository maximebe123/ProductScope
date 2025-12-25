"""
Base Streaming Pipeline Utilities

Provides common functionality for multi-agent streaming pipelines:
- Agent configuration management
- Event creation helpers
- Progress calculation
- Event handling utilities
"""

import asyncio
import logging
from dataclasses import dataclass, field
from typing import (
    Any,
    AsyncGenerator,
    Callable,
    Dict,
    List,
    Literal,
    Optional,
    Type,
    TypeVar,
    Union,
)

from pydantic import BaseModel

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


# =============================================================================
# AGENT CONFIGURATION
# =============================================================================

@dataclass
class AgentConfig:
    """Configuration for a streaming agent."""

    id: str
    description: str
    weight: int = 10  # For progress calculation (sum of all agents should = 100)
    model: Optional[str] = None
    reasoning_effort: Literal["low", "medium", "high"] = "medium"
    system_prompt: Optional[str] = None
    response_model: Optional[Type[BaseModel]] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "id": self.id,
            "description": self.description,
            "weight": self.weight,
        }


@dataclass
class PipelineConfig:
    """Configuration for a complete streaming pipeline."""

    name: str
    agents: List[AgentConfig]
    parallel_groups: List[List[str]] = field(default_factory=list)

    @property
    def agent_descriptions(self) -> Dict[str, str]:
        """Get agent ID to description mapping."""
        return {a.id: a.description for a in self.agents}

    @property
    def agent_weights(self) -> Dict[str, int]:
        """Get agent ID to weight mapping."""
        return {a.id: a.weight for a in self.agents}

    def get_agent(self, agent_id: str) -> Optional[AgentConfig]:
        """Get agent config by ID."""
        for agent in self.agents:
            if agent.id == agent_id:
                return agent
        return None


# =============================================================================
# STREAM EVENTS
# =============================================================================

StreamEventType = Literal[
    "agent_start",
    "agent_complete",
    "reasoning",
    "content",
    "parsed",
    "progress",
    "error",
    "complete",
    "review",
]


class StreamEvent(Dict[str, Any]):
    """Type for streaming events. Extends Dict for JSON serialization."""

    pass


def create_agent_start_event(
    agent_id: str,
    description: str,
    metadata: Optional[Dict[str, Any]] = None,
) -> StreamEvent:
    """Create an agent_start event."""
    event = StreamEvent(
        type="agent_start",
        agent=agent_id,
        description=description,
    )
    if metadata:
        event.update(metadata)
    return event


def create_agent_complete_event(
    agent_id: str,
    summary: str,
    metadata: Optional[Dict[str, Any]] = None,
) -> StreamEvent:
    """Create an agent_complete event."""
    event = StreamEvent(
        type="agent_complete",
        agent=agent_id,
        summary=summary,
    )
    if metadata:
        event.update(metadata)
    return event


def create_error_event(
    message: str,
    agent_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
) -> StreamEvent:
    """Create an error event."""
    event = StreamEvent(
        type="error",
        message=message,
    )
    if agent_id:
        event["agent"] = agent_id
    if details:
        event["details"] = details
    return event


def create_progress_event(
    progress: int,
    agent_id: Optional[str] = None,
    message: Optional[str] = None,
) -> StreamEvent:
    """Create a progress event."""
    event = StreamEvent(
        type="progress",
        progress=progress,
    )
    if agent_id:
        event["agent"] = agent_id
    if message:
        event["message"] = message
    return event


def create_complete_event(
    data: Any,
    summary: Optional[str] = None,
) -> StreamEvent:
    """Create a pipeline complete event."""
    event = StreamEvent(
        type="complete",
        data=data,
    )
    if summary:
        event["summary"] = summary
    return event


# =============================================================================
# PROGRESS CALCULATION
# =============================================================================

def calculate_progress(
    completed_agents: List[str],
    agent_weights: Dict[str, int],
    current_agent: Optional[str] = None,
    current_progress: float = 0.0,
) -> int:
    """
    Calculate overall pipeline progress based on completed agents.

    Args:
        completed_agents: List of completed agent IDs
        agent_weights: Mapping of agent ID to weight (should sum to 100)
        current_agent: Currently running agent (optional)
        current_progress: Progress within current agent (0.0 to 1.0)

    Returns:
        Overall progress percentage (0-100)
    """
    total = sum(
        agent_weights.get(agent_id, 0)
        for agent_id in completed_agents
    )

    if current_agent and current_agent in agent_weights:
        total += int(agent_weights[current_agent] * current_progress)

    return min(100, max(0, total))


# =============================================================================
# EVENT HANDLING UTILITIES
# =============================================================================

async def handle_stream_events(
    stream: AsyncGenerator[Dict[str, Any], None],
    state: Dict[str, Any],
    agent_id: str,
    state_key: Optional[str] = None,
    on_parsed: Optional[Callable[[Any], None]] = None,
) -> AsyncGenerator[StreamEvent, None]:
    """
    Handle events from a streaming agent and update state.

    Args:
        stream: The async generator from stream_with_structured_output
        state: The pipeline state dict to update
        agent_id: The agent ID for error messages
        state_key: Key to store parsed data in state (if different from agent_id)
        on_parsed: Optional callback when data is parsed

    Yields:
        StreamEvent objects for forwarding to the client
    """
    key = state_key or agent_id

    async for event in stream:
        event_type = event.get("type")

        if event_type == "reasoning":
            yield StreamEvent(**event)

        elif event_type == "content":
            yield StreamEvent(**event)

        elif event_type == "parsed":
            parsed_data = event.get("data")
            if parsed_data is not None:
                state[key] = parsed_data
                if on_parsed:
                    on_parsed(parsed_data)

        elif event_type == "error":
            yield StreamEvent(**event)
            logger.error(f"[{agent_id}] Error: {event.get('message')}")


async def merge_async_generators(
    *generators: AsyncGenerator[Any, None],
) -> AsyncGenerator[Any, None]:
    """
    Merge multiple async generators, yielding events as they arrive.

    Useful for running parallel agents and interleaving their outputs.
    """
    queues: List[asyncio.Queue] = [asyncio.Queue() for _ in generators]
    done_count = 0

    async def fill_queue(gen: AsyncGenerator, queue: asyncio.Queue) -> None:
        nonlocal done_count
        try:
            async for item in gen:
                await queue.put(item)
        finally:
            await queue.put(None)  # Signal completion
            done_count += 1

    # Start all generators concurrently
    tasks = [
        asyncio.create_task(fill_queue(gen, queue))
        for gen, queue in zip(generators, queues)
    ]

    # Yield items as they arrive
    try:
        while done_count < len(generators):
            for queue in queues:
                try:
                    item = queue.get_nowait()
                    if item is not None:
                        yield item
                except asyncio.QueueEmpty:
                    pass
            await asyncio.sleep(0.01)  # Small delay to prevent busy loop
    finally:
        # Cancel any remaining tasks
        for task in tasks:
            if not task.done():
                task.cancel()


# =============================================================================
# WRAPPER CLASSES FACTORY
# =============================================================================

def create_list_wrapper(
    name: str,
    item_model: Type[T],
    field_name: str = "items",
) -> Type[BaseModel]:
    """
    Create a Pydantic wrapper class for a list of items.

    Args:
        name: Name for the wrapper class
        item_model: The Pydantic model for list items
        field_name: Name of the list field

    Returns:
        A dynamically created Pydantic model class

    Example:
        ComponentListWrapper = create_list_wrapper(
            "ComponentListWrapper",
            ComponentSpec,
            "components"
        )
    """
    from pydantic import Field

    class ListWrapper(BaseModel):
        pass

    # Set the class name
    ListWrapper.__name__ = name
    ListWrapper.__qualname__ = name

    # Add the field dynamically
    ListWrapper.__annotations__ = {field_name: List[item_model]}
    setattr(ListWrapper, field_name, Field(default_factory=list))

    return ListWrapper
