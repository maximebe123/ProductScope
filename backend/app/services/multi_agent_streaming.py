"""
Multi-Agent Streaming Handler

Orchestrates the multi-agent pipeline with real-time streaming
of reasoning tokens from each agent.

The pipeline flows: Architect → Component → [Connection ∥ Grouping] → Layout → Reviewer → Finalizer

Each agent's reasoning and content is streamed as events for the frontend to display.
"""

import asyncio
import logging
from typing import Any, AsyncGenerator, Dict, List, Literal, Optional

from pydantic import ValidationError

from app.config import settings
from app.core.ai.agent_state import (
    ArchitecturePlan,
    ComponentSpec,
    ConnectionSpec,
    GroupSpec,
    LayoutPosition,
    QualityReview,
    MultiAgentState,
    create_initial_multi_agent_state,
)
from app.core.ai.prompts.architect_prompt import get_architect_prompt
from app.core.ai.prompts.component_prompt import get_component_prompt
from app.core.ai.prompts.connection_prompt import get_connection_prompt
from app.core.ai.prompts.grouping_prompt import get_grouping_prompt
from app.core.ai.prompts.layout_prompt import get_layout_prompt
from app.core.ai.prompts.reviewer_prompt import get_reviewer_prompt
from app.core.ai.prompts.finalizer_prompt import get_finalizer_prompt
from app.models.operations import DiagramContext
from app.services.streaming_agent_executor import (
    stream_with_structured_output,
    stream_without_structured_output,
)

logger = logging.getLogger(__name__)

from pydantic import BaseModel

# Agent descriptions for UI display
AGENT_DESCRIPTIONS = {
    "architect": "Analyzing architecture requirements",
    "component": "Designing system components",
    "connection": "Creating connections between components",
    "grouping": "Organizing components into groups",
    "layout": "Calculating optimal layout positions",
    "reviewer": "Reviewing diagram quality",
    "finalizer": "Assembling final diagram",
}


class ComponentListWrapper(BaseModel):
    """Wrapper for component list output."""
    components: List[ComponentSpec]


class ConnectionListWrapper(BaseModel):
    """Wrapper for connection list output."""
    connections: List[ConnectionSpec]


class GroupListWrapper(BaseModel):
    """Wrapper for group list output."""
    groups: List[GroupSpec]


class LayoutListWrapper(BaseModel):
    """Wrapper for layout positions output."""
    positions: List[LayoutPosition]


async def execute_multi_agent_with_streaming(
    description: str,
    module_type: Literal["flowchart", "diagrams", "mindmap"],
    context: Optional[Dict[str, Any]] = None,
    conversation_history: Optional[List[Dict[str, str]]] = None,
    max_attempts: int = 3,
    max_review_iterations: int = 2
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Execute the multi-agent pipeline with real-time streaming.

    Yields events as each agent processes:
    - agent_start: When an agent begins
    - reasoning: GPT-5 thinking tokens
    - content: Response content tokens (hidden from user)
    - agent_complete: When an agent finishes
    - review: Quality review results
    - complete: Final diagram result
    - error: If something fails

    Args:
        description: User's natural language request
        module_type: Which module to use
        context: Current diagram state
        conversation_history: Previous messages
        max_attempts: Maximum retry attempts
        max_review_iterations: Maximum review iterations

    Yields:
        Streaming events for the frontend
    """
    logger.info(f"[MultiAgentStream] Starting {module_type} pipeline")

    # Build diagram context
    diagram_context = None
    if context:
        try:
            diagram_context = DiagramContext(**context)
        except Exception as e:
            logger.warning(f"[MultiAgentStream] Failed to parse context: {e}")

    # Initialize state
    state: Dict[str, Any] = {
        "user_request": description,
        "module_type": module_type,
        "context": context,
        "conversation_history": conversation_history or [],
        "architecture_plan": None,
        "components": [],
        "connections": [],
        "groups": [],
        "layout_positions": [],
        "quality_review": None,
        "review_iterations": 0,
    }

    try:
        # ===== ARCHITECT AGENT =====
        yield {"type": "agent_start", "agent": "architect", "description": AGENT_DESCRIPTIONS["architect"]}

        architect_prompt = get_architect_prompt(
            context=diagram_context,
            conversation_history=conversation_history or []
        )

        async for event in stream_with_structured_output(
            messages=[
                {"role": "system", "content": architect_prompt},
                {"role": "user", "content": description}
            ],
            model=settings.MODEL_ARCHITECT,
            response_model=ArchitecturePlan,
            agent_name="architect",
            reasoning_effort="medium"
        ):
            if event["type"] == "reasoning":
                yield event
            elif event["type"] == "content":
                # Forward content tokens as fallback for models without reasoning
                yield event
            elif event["type"] == "parsed":
                state["architecture_plan"] = event["data"]
            elif event["type"] == "error":
                yield event
                yield {"type": "error", "message": f"Architect failed: {event['message']}"}
                return

        yield {
            "type": "agent_complete",
            "agent": "architect",
            "summary": f"Architecture plan created: {state['architecture_plan'].estimated_nodes} nodes expected"
        }

        # ===== COMPONENT AGENT =====
        yield {"type": "agent_start", "agent": "component", "description": AGENT_DESCRIPTIONS["component"]}

        component_prompt = get_component_prompt(
            architecture_plan=state["architecture_plan"]
        )

        async for event in stream_with_structured_output(
            messages=[
                {"role": "system", "content": component_prompt},
                {"role": "user", "content": description}
            ],
            model=settings.MODEL_COMPONENT,
            response_model=ComponentListWrapper,
            agent_name="component",
            reasoning_effort="medium"
        ):
            if event["type"] == "reasoning":
                yield event
            elif event["type"] == "content":
                yield event
            elif event["type"] == "parsed":
                state["components"] = event["data"].components
            elif event["type"] == "error":
                yield event

        yield {
            "type": "agent_complete",
            "agent": "component",
            "summary": f"{len(state['components'])} components designed"
        }

        # ===== CONNECTION & GROUPING AGENTS (Parallel) =====
        # Run connection and grouping agents in parallel
        connection_events: List[Dict] = []
        grouping_events: List[Dict] = []

        async def run_connection_agent():
            nonlocal connection_events
            yield {"type": "agent_start", "agent": "connection", "description": AGENT_DESCRIPTIONS["connection"]}

            connection_prompt = get_connection_prompt(
                components=state["components"]
            )

            async for event in stream_with_structured_output(
                messages=[
                    {"role": "system", "content": connection_prompt},
                    {"role": "user", "content": description}
                ],
                model=settings.MODEL_CONNECTION,
                response_model=ConnectionListWrapper,
                agent_name="connection",
                reasoning_effort="low"
            ):
                if event["type"] == "reasoning":
                    yield event
                elif event["type"] == "content":
                    yield event
                elif event["type"] == "parsed":
                    state["connections"] = event["data"].connections
                elif event["type"] == "error":
                    yield event

            yield {
                "type": "agent_complete",
                "agent": "connection",
                "summary": f"{len(state['connections'])} connections created"
            }

        async def run_grouping_agent():
            nonlocal grouping_events
            yield {"type": "agent_start", "agent": "grouping", "description": AGENT_DESCRIPTIONS["grouping"]}

            grouping_prompt = get_grouping_prompt(
                components=state["components"],
                architecture_plan=state["architecture_plan"]
            )

            async for event in stream_with_structured_output(
                messages=[
                    {"role": "system", "content": grouping_prompt},
                    {"role": "user", "content": description}
                ],
                model=settings.MODEL_GROUPING,
                response_model=GroupListWrapper,
                agent_name="grouping",
                reasoning_effort="low"
            ):
                if event["type"] == "reasoning":
                    yield event
                elif event["type"] == "content":
                    yield event
                elif event["type"] == "parsed":
                    state["groups"] = event["data"].groups
                elif event["type"] == "error":
                    yield event

            yield {
                "type": "agent_complete",
                "agent": "grouping",
                "summary": f"{len(state['groups'])} groups created"
            }

        # Run both agents and interleave their outputs
        async for event in _merge_async_generators(
            run_connection_agent(),
            run_grouping_agent()
        ):
            yield event

        # ===== LAYOUT AGENT =====
        yield {"type": "agent_start", "agent": "layout", "description": AGENT_DESCRIPTIONS["layout"]}

        layout_prompt = get_layout_prompt(
            components=state["components"],
            groups=state["groups"]
        )

        # Layout uses GPT-4o (no reasoning, but content tokens available)
        async for event in stream_with_structured_output(
            messages=[
                {"role": "system", "content": layout_prompt},
                {"role": "user", "content": description}
            ],
            model=settings.MODEL_LAYOUT,
            response_model=LayoutListWrapper,
            agent_name="layout",
            reasoning_effort="low"
        ):
            if event["type"] == "reasoning":
                yield event  # Won't happen for GPT-4o
            elif event["type"] == "content":
                yield event  # Forward content tokens for activity indication
            elif event["type"] == "parsed":
                state["layout_positions"] = event["data"].positions
            elif event["type"] == "error":
                yield event

        yield {
            "type": "agent_complete",
            "agent": "layout",
            "summary": f"Layout calculated for {len(state['layout_positions'])} nodes"
        }

        # ===== REVIEWER AGENT =====
        review_loop = 0
        while review_loop < max_review_iterations:
            yield {"type": "agent_start", "agent": "reviewer", "description": AGENT_DESCRIPTIONS["reviewer"]}

            reviewer_prompt = get_reviewer_prompt(
                architecture_plan=state["architecture_plan"],
                components=state["components"],
                connections=state["connections"],
                groups=state["groups"],
                layout_positions=state["layout_positions"],
                review_iteration=review_loop
            )

            async for event in stream_with_structured_output(
                messages=[
                    {"role": "system", "content": reviewer_prompt},
                    {"role": "user", "content": description}
                ],
                model=settings.MODEL_REVIEWER,
                response_model=QualityReview,
                agent_name="reviewer",
                reasoning_effort="medium"
            ):
                if event["type"] == "reasoning":
                    yield event
                elif event["type"] == "content":
                    yield event
                elif event["type"] == "parsed":
                    state["quality_review"] = event["data"]
                elif event["type"] == "error":
                    yield event

            review = state["quality_review"]
            yield {
                "type": "review",
                "score": review.overall_score,
                "decision": review.decision,
                "issues": review.issues[:3] if review.issues else []
            }

            yield {
                "type": "agent_complete",
                "agent": "reviewer",
                "summary": f"Quality score: {review.overall_score}/10"
            }

            # Check if approved
            if review.decision == "approve" or review.overall_score >= 8:
                break

            review_loop += 1

            # If not approved, we'd need to re-run specific agents
            # For now, we'll just continue to finalizer after max iterations
            logger.info(f"[MultiAgentStream] Review iteration {review_loop}/{max_review_iterations}")

        # ===== FINALIZER AGENT =====
        yield {"type": "agent_start", "agent": "finalizer", "description": AGENT_DESCRIPTIONS["finalizer"]}

        # Build the final diagram structure
        final_diagram = build_final_diagram(
            components=state["components"],
            connections=state["connections"],
            groups=state["groups"],
            layout_positions=state["layout_positions"]
        )

        yield {
            "type": "agent_complete",
            "agent": "finalizer",
            "summary": f"Diagram assembled: {len(final_diagram['nodes'])} nodes, {len(final_diagram['edges'])} edges"
        }

        # ===== COMPLETE =====
        final_response = {
            "success": True,
            "operation_type": "generate",
            "message": f"Generated diagram with {len(final_diagram['nodes'])} nodes and {len(final_diagram['edges'])} edges",
            "diagram": final_diagram
        }

        yield {"type": "complete", "data": final_response}

    except Exception as e:
        logger.error(f"[MultiAgentStream] Pipeline error: {e}", exc_info=True)
        yield {"type": "error", "message": str(e)}


def build_final_diagram(
    components: List[ComponentSpec],
    connections: List[ConnectionSpec],
    groups: List[GroupSpec],
    layout_positions: List[LayoutPosition]
) -> Dict[str, Any]:
    """Build the final diagram structure from agent outputs."""
    # Create position lookup
    position_map = {pos.node_id: pos for pos in layout_positions}

    # Build nodes
    nodes = []
    for comp in components:
        pos = position_map.get(comp.id)
        node = {
            "id": comp.id,
            "type": "customNode",
            "position": {
                "x": pos.x if pos else 0,
                "y": pos.y if pos else 0
            },
            "data": {
                "label": comp.label,
                "nodeType": comp.nodeType,
                "tags": comp.tags,
            }
        }
        if comp.volumes:
            node["data"]["volumes"] = [
                {"name": v.name, "mountPath": v.mountPath}
                for v in comp.volumes
            ]
        nodes.append(node)

    # Build edges
    edges = []
    for conn in connections:
        edges.append({
            "id": conn.id,
            "source": conn.source,
            "target": conn.target,
            "label": conn.label,
            "type": "custom",
            "animated": True
        })

    # Build groups
    group_nodes = []
    for group in groups:
        # Find bounding box for group
        group_node_ids = group.node_ids
        group_positions = [position_map[nid] for nid in group_node_ids if nid in position_map]

        if group_positions:
            min_x = min(p.x for p in group_positions) - 20
            min_y = min(p.y for p in group_positions) - 50
            max_x = max(p.x for p in group_positions) + 200
            max_y = max(p.y for p in group_positions) + 150

            group_nodes.append({
                "id": group.id,
                "type": "groupNode",
                "position": {"x": min_x, "y": min_y},
                "data": {
                    "label": group.label,
                    "tags": group.tags,
                    "isGroup": True
                },
                "style": {
                    "width": max_x - min_x,
                    "height": max_y - min_y
                }
            })

    return {
        "nodes": nodes + group_nodes,
        "edges": edges
    }


async def _merge_async_generators(*generators) -> AsyncGenerator[Dict[str, Any], None]:
    """Merge multiple async generators, yielding from each as events arrive."""
    tasks = {}
    pending = set()

    async def wrap_gen(gen, idx):
        async for item in gen:
            yield (idx, item)

    for i, gen in enumerate(generators):
        task = asyncio.create_task(wrap_gen(gen, i).__anext__())
        tasks[i] = (gen, wrap_gen(gen, i))
        pending.add(task)

    # Simplified: just run them sequentially for now
    # True interleaving requires more complex async handling
    for gen in generators:
        async for event in gen:
            yield event
