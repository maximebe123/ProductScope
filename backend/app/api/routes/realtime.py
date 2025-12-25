"""WebSocket endpoint for Realtime API voice mode with multi-tool support"""

import json
import asyncio
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import websockets

from app.config import settings
from app.services.realtime_session import get_session_config_with_context
from app.services.operation_handler import operation_handler
from app.models.operations import DiagramContext, ContextNode, ContextEdge
from app.utils.prompts import build_context_prompt

router = APIRouter()
logger = logging.getLogger(__name__)

OPENAI_REALTIME_URL = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview"


def parse_context_from_message(data: dict) -> DiagramContext:
    """Parse diagram context from WebSocket message."""
    nodes = [
        ContextNode(
            id=n.get("id", ""),
            label=n.get("label", ""),
            nodeType=n.get("nodeType", "server"),
            tags=n.get("tags", []),
            parentGroup=n.get("parentGroup"),
            isGroup=n.get("isGroup", False),
        )
        for n in data.get("nodes", [])
    ]
    edges = [
        ContextEdge(
            id=e.get("id", ""),
            source=e.get("source", ""),
            target=e.get("target", ""),
            label=e.get("label"),
        )
        for e in data.get("edges", [])
    ]
    return DiagramContext(nodes=nodes, edges=edges)


@router.websocket("/ws/realtime")
async def realtime_websocket(websocket: WebSocket):
    """
    WebSocket endpoint that proxies audio between the client and OpenAI Realtime API.

    Protocol:
    - Client sends: { type: "context", data: {...} } to set diagram context
    - Client sends: { type: "audio", data: "<base64 pcm16>" }
    - Client sends: { type: "commit" } to finalize audio input
    - Server sends: { type: "ready" } when session is configured
    - Server sends: { type: "audio", data: "<base64 pcm16>" } for audio responses
    - Server sends: { type: "diagram", data: {...} } for full diagram generation
    - Server sends: { type: "merge", data: {...} } for incremental operations
    - Server sends: { type: "transcription", text: "..." } for real-time transcription
    - Server sends: { type: "error", message: "..." } on errors
    """
    await websocket.accept()
    logger.info("Client connected to realtime WebSocket")

    # Store diagram context
    diagram_context: DiagramContext | None = None

    try:
        # Connect to OpenAI Realtime API
        async with websockets.connect(
            OPENAI_REALTIME_URL,
            additional_headers={
                "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                "OpenAI-Beta": "realtime=v1",
            },
        ) as openai_ws:
            logger.info("Connected to OpenAI Realtime API")

            # Track current function call
            current_arguments = ""
            session_configured = False

            async def configure_session(context: DiagramContext | None = None):
                """Configure the OpenAI session with optional diagram context."""
                nonlocal session_configured

                # Build context prompt
                context_prompt = ""
                if context and (context.nodes or context.edges):
                    context_prompt = build_context_prompt(context)
                    logger.info(f"Session configured with context: {len(context.nodes)} nodes")

                # Get session config with context
                session_config = get_session_config_with_context(context_prompt)

                await openai_ws.send(
                    json.dumps({"type": "session.update", "session": session_config})
                )
                session_configured = True
                logger.info("Session configured with all 8 tools")

            async def forward_to_openai():
                """Forward audio from client to OpenAI"""
                nonlocal diagram_context, session_configured
                try:
                    while True:
                        message = await websocket.receive_json()
                        msg_type = message.get("type")

                        if msg_type == "context":
                            # Store diagram context and configure session
                            diagram_context = parse_context_from_message(message.get("data", {}))
                            await configure_session(diagram_context)
                            # Notify client we're ready after context is set
                            await websocket.send_json({"type": "ready"})

                        elif msg_type == "audio":
                            # Configure session if not done yet (no context case)
                            if not session_configured:
                                await configure_session(None)
                                await websocket.send_json({"type": "ready"})

                            # Forward audio to OpenAI
                            await openai_ws.send(
                                json.dumps(
                                    {
                                        "type": "input_audio_buffer.append",
                                        "audio": message.get("data", ""),
                                    }
                                )
                            )
                        elif msg_type == "commit":
                            # Commit audio buffer (manual turn detection)
                            await openai_ws.send(
                                json.dumps({"type": "input_audio_buffer.commit"})
                            )
                            await openai_ws.send(
                                json.dumps({"type": "response.create"})
                            )

                except WebSocketDisconnect:
                    logger.info("Client disconnected")
                    raise

            async def forward_to_client():
                """Forward responses from OpenAI to client"""
                nonlocal current_arguments

                try:
                    async for message in openai_ws:
                        event = json.loads(message)
                        event_type = event.get("type", "")

                        # Audio response - stream to client
                        if event_type == "response.audio.delta":
                            await websocket.send_json(
                                {"type": "audio", "data": event.get("delta", "")}
                            )

                        # Audio response complete
                        elif event_type == "response.audio.done":
                            await websocket.send_json({"type": "audio_done"})

                        # Real-time transcription of user speech
                        elif event_type == "conversation.item.input_audio_transcription.completed":
                            transcript = event.get("transcript", "")
                            if transcript:
                                await websocket.send_json(
                                    {"type": "transcription", "text": transcript}
                                )

                        # Function call argument streaming
                        elif event_type == "response.function_call_arguments.delta":
                            current_arguments += event.get("delta", "")

                        # Function call complete
                        elif event_type == "response.function_call_arguments.done":
                            call_id = event.get("call_id", "")
                            name = event.get("name", "")
                            arguments = event.get("arguments", current_arguments)

                            logger.info(f"Function call: {name} with call_id: {call_id}")

                            try:
                                args = json.loads(arguments)

                                # Use the operation handler to process the tool call
                                result = operation_handler.handle_tool_call(
                                    tool_name=name,
                                    arguments=args,
                                    context=diagram_context
                                )

                                if result.success:
                                    # Determine response type
                                    if result.is_full_generation():
                                        # Full diagram replacement
                                        await websocket.send_json({
                                            "type": "diagram",
                                            "data": result.diagram.model_dump() if result.diagram else {}
                                        })
                                        tool_output = {
                                            "success": True,
                                            "operation": "generate",
                                            "node_count": len(result.diagram.nodes) if result.diagram else 0
                                        }
                                    else:
                                        # Incremental merge operation
                                        await websocket.send_json({
                                            "type": "merge",
                                            "data": {
                                                "operation_type": result.operation_type,
                                                "nodes_to_add": [n.model_dump() for n in result.nodes_to_add],
                                                "nodes_to_modify": [m.model_dump() for m in result.nodes_to_modify],
                                                "nodes_to_delete": result.nodes_to_delete,
                                                "edges_to_add": [e.model_dump() for e in result.edges_to_add],
                                                "edges_to_modify": [m.model_dump() for m in result.edges_to_modify],
                                                "edges_to_delete": result.edges_to_delete,
                                                "groups_to_create": [g.model_dump() for g in result.groups_to_create],
                                                "message": result.message
                                            }
                                        })
                                        tool_output = {
                                            "success": True,
                                            "operation": result.operation_type,
                                            "message": result.message
                                        }

                                    # Return success to OpenAI so it can respond
                                    await openai_ws.send(
                                        json.dumps({
                                            "type": "conversation.item.create",
                                            "item": {
                                                "type": "function_call_output",
                                                "call_id": call_id,
                                                "output": json.dumps(tool_output)
                                            }
                                        })
                                    )
                                else:
                                    # Operation failed
                                    await openai_ws.send(
                                        json.dumps({
                                            "type": "conversation.item.create",
                                            "item": {
                                                "type": "function_call_output",
                                                "call_id": call_id,
                                                "output": json.dumps({
                                                    "success": False,
                                                    "error": result.message
                                                })
                                            }
                                        })
                                    )

                                # Trigger response generation
                                await openai_ws.send(
                                    json.dumps({"type": "response.create"})
                                )

                            except json.JSONDecodeError as e:
                                logger.error(f"Failed to parse function args: {e}", exc_info=True)
                                await openai_ws.send(
                                    json.dumps({
                                        "type": "conversation.item.create",
                                        "item": {
                                            "type": "function_call_output",
                                            "call_id": call_id,
                                            "output": json.dumps({"error": "Invalid arguments"})
                                        }
                                    })
                                )
                                await openai_ws.send(
                                    json.dumps({"type": "response.create"})
                                )

                            # Reset for next call
                            current_arguments = ""

                        # Response completed
                        elif event_type == "response.done":
                            await websocket.send_json({"type": "response_done"})

                        # Error handling
                        elif event_type == "error":
                            error = event.get("error", {})
                            logger.error(f"OpenAI error: {error}")
                            await websocket.send_json({
                                "type": "error",
                                "message": error.get("message", "Unknown error")
                            })

                except websockets.exceptions.ConnectionClosed:
                    logger.info("OpenAI connection closed")
                    raise

            # Run both tasks concurrently
            await asyncio.gather(forward_to_openai(), forward_to_client())

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as e:
        logger.error(f"Realtime WebSocket error: {e}", exc_info=True)
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass  # Client already disconnected, nothing we can do
