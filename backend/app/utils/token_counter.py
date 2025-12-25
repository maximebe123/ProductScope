"""
Token counting and cost estimation for AI operations.
Uses tiktoken for accurate OpenAI token counting.
"""

import logging
from typing import Optional
from functools import lru_cache

import tiktoken

logger = logging.getLogger(__name__)

# Model pricing per 1K tokens (as of 2024)
# Input and output pricing in USD
MODEL_PRICING = {
    # GPT-5.2 models
    "gpt-5.2": {"input": 0.03, "output": 0.06},
    # GPT-4o models
    "gpt-4o": {"input": 0.005, "output": 0.015},
    "gpt-4o-2024-08-06": {"input": 0.005, "output": 0.015},
    "gpt-4o-mini": {"input": 0.00015, "output": 0.0006},
    # Realtime
    "gpt-4o-realtime-preview": {"input": 0.10, "output": 0.20},  # Audio tokens
    # Legacy
    "gpt-4-turbo": {"input": 0.01, "output": 0.03},
    "gpt-4": {"input": 0.03, "output": 0.06},
    "gpt-3.5-turbo": {"input": 0.0005, "output": 0.0015},
}

# Default encoding for unknown models
DEFAULT_ENCODING = "cl100k_base"


@lru_cache(maxsize=10)
def get_encoding(model: str) -> tiktoken.Encoding:
    """
    Get the tiktoken encoding for a model.
    Caches encodings for performance.
    """
    try:
        return tiktoken.encoding_for_model(model)
    except KeyError:
        # Fallback for unknown models (like GPT-5.2)
        return tiktoken.get_encoding(DEFAULT_ENCODING)


def count_tokens(text: str, model: str = "gpt-4o") -> int:
    """
    Count the number of tokens in a text string.

    Args:
        text: The text to count tokens for
        model: The model name for encoding selection

    Returns:
        Number of tokens
    """
    if not text:
        return 0

    encoding = get_encoding(model)
    return len(encoding.encode(text))


def count_message_tokens(
    messages: list[dict],
    model: str = "gpt-4o"
) -> int:
    """
    Count tokens for a list of chat messages.
    Accounts for message formatting overhead.

    Args:
        messages: List of message dicts with 'role' and 'content'
        model: The model name

    Returns:
        Total token count
    """
    encoding = get_encoding(model)

    # Token overhead per message (role, content separators)
    tokens_per_message = 4  # Approximate for GPT-4 style

    total = 0
    for message in messages:
        total += tokens_per_message
        for key, value in message.items():
            if isinstance(value, str):
                total += len(encoding.encode(value))

    # Add reply priming tokens
    total += 3

    return total


def estimate_cost(
    input_tokens: int,
    output_tokens: int,
    model: str
) -> float:
    """
    Estimate the cost of an API call.

    Args:
        input_tokens: Number of input tokens
        output_tokens: Number of output tokens
        model: The model name

    Returns:
        Estimated cost in USD
    """
    pricing = MODEL_PRICING.get(model, MODEL_PRICING.get("gpt-4o"))

    input_cost = (input_tokens / 1000) * pricing["input"]
    output_cost = (output_tokens / 1000) * pricing["output"]

    return input_cost + output_cost


def estimate_multi_agent_cost(
    description: str,
    context_tokens: int = 0
) -> dict:
    """
    Estimate the cost of a multi-agent pipeline.

    The 7-agent pipeline uses:
    - GPT-5.2 for Architect, Component, Reviewer (deep reasoning)
    - GPT-5.2 for Connection, Grouping (fast reasoning)
    - GPT-4o for Layout, Finalizer (execution)

    Args:
        description: The user's description
        context_tokens: Additional context tokens (existing diagram)

    Returns:
        Dict with token counts and cost estimates
    """
    base_tokens = count_tokens(description, "gpt-4o")

    # Estimate input/output per agent
    agent_estimates = {
        # Deep reasoning agents (GPT-5.2)
        "architect": {"model": "gpt-5.2", "input": base_tokens + 500, "output": 800},
        "component": {"model": "gpt-5.2", "input": base_tokens + 800, "output": 1200},
        "reviewer": {"model": "gpt-5.2", "input": base_tokens + 2000, "output": 500},

        # Fast reasoning agents (GPT-5.2)
        "connection": {"model": "gpt-5.2", "input": base_tokens + 1000, "output": 600},
        "grouping": {"model": "gpt-5.2", "input": base_tokens + 800, "output": 400},

        # Execution agents (GPT-4o)
        "layout": {"model": "gpt-4o", "input": base_tokens + 1500, "output": 1000},
        "finalizer": {"model": "gpt-4o", "input": base_tokens + 2000, "output": 1500},
    }

    total_input = context_tokens
    total_output = 0
    total_cost = 0.0

    for agent, estimate in agent_estimates.items():
        input_tokens = estimate["input"]
        output_tokens = estimate["output"]
        cost = estimate_cost(input_tokens, output_tokens, estimate["model"])

        total_input += input_tokens
        total_output += output_tokens
        total_cost += cost

    return {
        "description_tokens": base_tokens,
        "context_tokens": context_tokens,
        "estimated_input_tokens": total_input,
        "estimated_output_tokens": total_output,
        "estimated_total_tokens": total_input + total_output,
        "estimated_cost_usd": round(total_cost, 4),
        "agents": agent_estimates,
    }


class TokenBudget:
    """
    Track token usage against a budget.
    """

    def __init__(
        self,
        daily_limit: int = 100000,
        per_request_limit: int = 10000
    ):
        self.daily_limit = daily_limit
        self.per_request_limit = per_request_limit
        self.daily_usage = 0
        self.last_reset_date: Optional[str] = None

    def check_budget(self, estimated_tokens: int) -> tuple[bool, str]:
        """
        Check if a request is within budget.

        Args:
            estimated_tokens: Estimated tokens for the request

        Returns:
            Tuple of (allowed, message)
        """
        if estimated_tokens > self.per_request_limit:
            return False, f"Request exceeds per-request limit ({estimated_tokens} > {self.per_request_limit})"

        if self.daily_usage + estimated_tokens > self.daily_limit:
            return False, f"Daily token limit reached ({self.daily_usage}/{self.daily_limit})"

        return True, "OK"

    def record_usage(self, tokens: int) -> None:
        """Record token usage."""
        self.daily_usage += tokens

    def reset_daily(self) -> None:
        """Reset daily usage counter."""
        self.daily_usage = 0


# Global budget tracker (in production, this should be per-user in database)
default_budget = TokenBudget()
