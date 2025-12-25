"""
Shared OpenAI Client

Provides a singleton AsyncOpenAI client used by all agents.
Eliminates duplicate client initialization code across agents.
"""

from openai import AsyncOpenAI

from app.config import settings

# Lazy-loaded OpenAI client singleton
_client = None


def get_openai_client() -> AsyncOpenAI:
    """
    Get or create the shared OpenAI client singleton.

    Returns:
        AsyncOpenAI client instance
    """
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


def reset_client() -> None:
    """Reset the client singleton (useful for testing)."""
    global _client
    _client = None
