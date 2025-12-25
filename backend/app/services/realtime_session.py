"""Realtime API session configuration for voice mode with all 8 tools"""

from app.services.ai_tools import ALL_TOOLS_REALTIME
from app.utils.prompts import SYSTEM_PROMPT

# Session configuration for Realtime API
SESSION_CONFIG = {
    "modalities": ["text", "audio"],
    "instructions": SYSTEM_PROMPT,
    "voice": "coral",
    "input_audio_format": "pcm16",
    "output_audio_format": "pcm16",
    "input_audio_transcription": {"model": "whisper-1"},
    "turn_detection": {
        "type": "server_vad",
        "threshold": 0.5,
        "prefix_padding_ms": 300,
        "silence_duration_ms": 800
    },
    "tools": ALL_TOOLS_REALTIME,
}


def get_session_config_with_context(context_prompt: str = "") -> dict:
    """
    Get session config with optional diagram context injected.

    Args:
        context_prompt: Additional context about current diagram state

    Returns:
        Session configuration dict for OpenAI Realtime API
    """
    config = SESSION_CONFIG.copy()

    if context_prompt:
        config["instructions"] = SYSTEM_PROMPT + context_prompt

    return config
