"""Diagram generation service using OpenAI structured output"""

from app.models.diagram import GeneratedDiagram
from app.utils.prompts import get_system_prompt, get_user_prompt
from app.config import settings
from app.services.common_operation_handler import get_openai_client


class DiagramGeneratorService:
    """Service for generating diagrams from text descriptions using OpenAI"""

    @property
    def client(self):
        """Get the shared OpenAI client singleton."""
        return get_openai_client()

    async def generate_from_text(self, description: str) -> GeneratedDiagram:
        """
        Generate a diagram using OpenAI structured output.

        Args:
            description: Natural language description of the architecture

        Returns:
            A GeneratedDiagram with nodes and edges

        Raises:
            ValueError: If the model refuses to generate or fails to parse
        """
        completion = await self.client.beta.chat.completions.parse(
            model=settings.OPENAI_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": get_system_prompt(),
                },
                {
                    "role": "user",
                    "content": get_user_prompt(description),
                },
            ],
            response_format=GeneratedDiagram,
        )

        message = completion.choices[0].message

        if message.parsed:
            return message.parsed
        elif message.refusal:
            raise ValueError(f"Model refused to generate diagram: {message.refusal}")
        else:
            raise ValueError("Failed to parse diagram response")


# Singleton instance
diagram_generator = DiagramGeneratorService()
