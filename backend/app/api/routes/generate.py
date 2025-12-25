"""Text-based diagram generation endpoint"""

from fastapi import APIRouter, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import settings
from app.models.requests import TextGenerationRequest
from app.models.responses import DiagramResponse
from app.services.diagram_generator import diagram_generator
from app.services.layout_engine import layout_engine

router = APIRouter()

# Rate limiter instance
limiter = Limiter(key_func=get_remote_address)


@router.post(
    "/generate",
    response_model=DiagramResponse,
    responses={429: {"description": "Rate limit exceeded"}},
)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def generate_diagram(request: Request, body: TextGenerationRequest):
    """
    Generate a diagram from a text description.

    This endpoint uses OpenAI's structured output to generate a valid
    diagram structure, then applies a layout algorithm to position
    the nodes on the canvas.

    Args:
        request: The text generation request with description

    Returns:
        DiagramResponse with positioned nodes and edges
    """
    try:
        # Generate raw diagram structure using OpenAI
        raw_diagram = await diagram_generator.generate_from_text(body.description)

        # Apply layout algorithm to position nodes
        positioned_diagram = layout_engine.apply_layout(raw_diagram)

        return DiagramResponse(
            success=True,
            diagram=positioned_diagram,
            message=f"Generated diagram with {len(positioned_diagram.nodes)} nodes and {len(positioned_diagram.edges)} connections",
        )

    except ValueError as e:
        # Model refusal or parsing error
        raise HTTPException(status_code=422, detail=str(e))

    except Exception as e:
        # Unexpected error
        raise HTTPException(
            status_code=500, detail=f"Failed to generate diagram: {str(e)}"
        )
