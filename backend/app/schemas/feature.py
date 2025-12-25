from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.models.feature import FeatureStatus, FeaturePriority


class FeatureBase(BaseModel):
    """Base feature fields."""

    title: str = Field(..., min_length=1, max_length=500)
    problem: Optional[str] = None
    solution: Optional[str] = None
    target_users: Optional[str] = None
    success_metrics: Optional[str] = None
    user_stories: List[str] = []
    technical_notes: Optional[str] = None
    priority: FeaturePriority = FeaturePriority.MEDIUM
    tags: List[str] = []


class FeatureCreate(FeatureBase):
    """Schema for creating a feature."""
    pass


class FeatureUpdate(BaseModel):
    """Schema for updating a feature."""

    title: Optional[str] = Field(None, min_length=1, max_length=500)
    problem: Optional[str] = None
    solution: Optional[str] = None
    target_users: Optional[str] = None
    success_metrics: Optional[str] = None
    user_stories: Optional[List[str]] = None
    technical_notes: Optional[str] = None
    status: Optional[FeatureStatus] = None
    priority: Optional[FeaturePriority] = None
    tags: Optional[List[str]] = None


class FeatureResponse(FeatureBase):
    """Schema for feature response."""

    id: str
    project_id: str
    status: FeatureStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FeatureGenerateRequest(BaseModel):
    """Schema for AI feature generation request."""

    description: str = Field(..., min_length=10, max_length=5000)


class FeatureGenerateResponse(BaseModel):
    """Schema for AI feature generation response."""

    feature: FeatureResponse


# === GitHub Discovery Schemas ===


class FeatureDiscoveryRequest(BaseModel):
    """Schema for GitHub feature discovery request (discover NEW features)."""

    max_features: int = Field(default=15, ge=5, le=30)
    include_tech_debt: bool = Field(default=True)
    user_context: Optional[str] = Field(
        default=None,
        max_length=2000,
        description="Optional guidance (e.g., 'Focus on mobile features')"
    )
    auth_token: Optional[str] = Field(
        default=None,
        description="GitHub OAuth token for private repositories"
    )


class FeatureExtractionRequest(BaseModel):
    """Schema for GitHub feature extraction request (extract EXISTING features)."""

    max_features: int = Field(default=20, ge=5, le=50)
    focus_areas: List[str] = Field(
        default_factory=list,
        max_length=10,
        description="Areas to focus on (e.g., 'api', 'frontend', 'auth')"
    )
    user_context: Optional[str] = Field(
        default=None,
        max_length=2000,
        description="Optional guidance for extraction"
    )
    auth_token: Optional[str] = Field(
        default=None,
        description="GitHub OAuth token for private repositories"
    )


class CandidateFeature(BaseModel):
    """A candidate feature from discovery."""

    temp_id: str
    title: str
    problem: str
    solution: str
    target_users: str
    success_metrics: str
    technical_notes: Optional[str] = None
    priority: str  # low, medium, high, critical
    priority_score: int = Field(ge=1, le=100)
    effort_estimate: str  # small, medium, large, xlarge
    impact_estimate: str  # low, medium, high
    tags: List[str] = []
    category: str
    source: str


class FeatureBatchCreateRequest(BaseModel):
    """Schema for batch creating features from discovery."""

    features: List[CandidateFeature]


class FeatureBatchCreateResponse(BaseModel):
    """Schema for batch creation response."""

    created: List[FeatureResponse]
    count: int
