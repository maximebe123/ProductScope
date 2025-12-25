"""
Layout Optimizer Agent

Positions nodes using layer-based layout.
Uses GPT-4o for reliable numerical calculations.
Can also use deterministic layout engine as fallback.
"""

import logging
from typing import Any, Dict, List

from pydantic import BaseModel

from app.config import settings
from app.core.ai.agent_state import MultiAgentState, LayoutPosition
from app.core.ai.client import get_openai_client
from app.core.ai.prompts.layout_prompt import get_layout_prompt

logger = logging.getLogger(__name__)

# Layout constants
GRID_SIZE = 24
NODE_WIDTH = 180
NODE_HEIGHT = 100
HORIZONTAL_GAP = 72
VERTICAL_GAP = 120
START_X = 100
LAYER_Y_POSITIONS = {
    0: 100,   # External
    1: 300,   # Frontend
    2: 500,   # Integration
    3: 700,   # Services
    4: 900,   # Data
    5: 1100,  # Observability
}


class LayoutListResponse(BaseModel):
    """Wrapper for layout position list response"""
    positions: List[LayoutPosition]


def snap_to_grid(value: int) -> int:
    """Snap a value to the grid."""
    return round(value / GRID_SIZE) * GRID_SIZE


def calculate_layout_deterministic(components: list, groups: list) -> List[LayoutPosition]:
    """
    Calculate layout positions deterministically.

    This is a fallback when LLM layout fails.
    """
    positions = []

    # Group components by layer
    by_layer = {}
    for comp in components:
        layer = comp.suggested_layer
        if layer not in by_layer:
            by_layer[layer] = []
        by_layer[layer].append(comp)

    # Calculate positions for each layer
    for layer in sorted(by_layer.keys()):
        nodes_in_layer = by_layer[layer]
        node_count = len(nodes_in_layer)

        # Calculate total width of this layer
        total_width = (node_count * NODE_WIDTH) + ((node_count - 1) * HORIZONTAL_GAP)

        # Center the layer (assuming 1200px canvas)
        canvas_width = 1200
        start_x = max(START_X, (canvas_width - total_width) // 2)

        # Get Y position for this layer
        y = LAYER_Y_POSITIONS.get(layer, 100 + layer * VERTICAL_GAP)

        # Position each node
        for order, comp in enumerate(nodes_in_layer):
            x = start_x + (order * (NODE_WIDTH + HORIZONTAL_GAP))

            positions.append(LayoutPosition(
                node_id=comp.id,
                layer=layer,
                order=order,
                x=snap_to_grid(x),
                y=snap_to_grid(y)
            ))

    return positions


async def layout_agent(state: MultiAgentState) -> Dict[str, Any]:
    """
    Layout Optimizer: Positions nodes by layers.

    Uses GPT-4o for reliable numerical calculations.
    Falls back to deterministic layout if LLM fails.

    Args:
        state: Current multi-agent state

    Returns:
        Dict with layout_positions list and updated state fields
    """
    logger.info("[Layout] Starting layout optimization")

    components = state.get("components", [])
    groups = state.get("groups", [])

    if not components:
        logger.warning("[Layout] No components to layout")
        return {
            "layout_positions": [],
            "current_agent": "layout",
            "messages": [{
                "role": "system",
                "content": "[Layout] No components to layout"
            }]
        }

    # Try LLM-based layout first for complex diagrams
    use_llm = len(components) > 3  # Use LLM for larger diagrams

    if use_llm:
        try:
            # Get the specialized prompt
            prompt = get_layout_prompt(components, groups)

            # Build user message
            user_message = """Calculate the optimal positions for all nodes.

Ensure proper layer ordering and grid snapping.
Return a JSON object with a 'positions' array."""

            # Call GPT-4o for reliable calculations
            client = get_openai_client()

            response = await client.beta.chat.completions.parse(
                model=settings.MODEL_LAYOUT,
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": user_message}
                ],
                response_format=LayoutListResponse,
                temperature=0.2,  # GPT-4o supports temperature
            )

            result = response.choices[0].message.parsed
            positions = result.positions

            logger.info(f"[Layout] LLM positioned {len(positions)} nodes")

            # Validate positions
            if len(positions) != len(components):
                logger.warning(
                    f"[Layout] Position count mismatch: "
                    f"{len(positions)} vs {len(components)} components"
                )
                # Fall back to deterministic
                positions = calculate_layout_deterministic(components, groups)

        except Exception as e:
            logger.error(f"[Layout] LLM error, using deterministic: {e}", exc_info=True)
            positions = calculate_layout_deterministic(components, groups)
    else:
        # Use deterministic layout for small diagrams
        logger.info("[Layout] Using deterministic layout for small diagram")
        positions = calculate_layout_deterministic(components, groups)

    logger.info(f"[Layout] Final positions: {len(positions)} nodes")

    # Update agent history
    agent_history = state.get("agent_history", []).copy()
    agent_history.append("layout")

    return {
        "layout_positions": positions,
        "current_agent": "layout",
        "agent_history": agent_history,
        "messages": [{
            "role": "system",
            "content": f"[Layout] Positioned {len(positions)} nodes"
        }]
    }
