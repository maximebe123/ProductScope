from pydantic import BaseModel, Field, field_validator


class TextGenerationRequest(BaseModel):
    """Request body for text-based diagram generation"""
    description: str = Field(
        ...,
        min_length=10,
        max_length=1000000,
        description="Natural language description of the architecture to generate"
    )

    @field_validator("description")
    @classmethod
    def sanitize_description(cls, v: str) -> str:
        """Clean up the description text"""
        # Strip excessive whitespace
        return " ".join(v.split())
