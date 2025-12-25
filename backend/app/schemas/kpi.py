from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.models.kpi import KPIStatus, KPIPriority, KPICategory


class KPIBase(BaseModel):
    """Base KPI fields."""

    name: str = Field(..., min_length=1, max_length=500)
    definition: str = Field(..., min_length=1)
    category: KPICategory = KPICategory.EFFICIENCY
    calculation_method: Optional[str] = None
    data_sources: List[str] = []
    unit: Optional[str] = Field(None, max_length=50)
    frequency: Optional[str] = Field(None, max_length=50)
    target_guidance: Optional[str] = None
    business_value: Optional[str] = None
    impact_areas: List[str] = []
    technical_notes: Optional[str] = None
    priority: KPIPriority = KPIPriority.MEDIUM
    tags: List[str] = []


class KPICreate(KPIBase):
    """Schema for creating a KPI."""
    pass


class KPIUpdate(BaseModel):
    """Schema for updating a KPI."""

    name: Optional[str] = Field(None, min_length=1, max_length=500)
    definition: Optional[str] = None
    category: Optional[KPICategory] = None
    calculation_method: Optional[str] = None
    data_sources: Optional[List[str]] = None
    unit: Optional[str] = Field(None, max_length=50)
    frequency: Optional[str] = Field(None, max_length=50)
    target_guidance: Optional[str] = None
    business_value: Optional[str] = None
    impact_areas: Optional[List[str]] = None
    technical_notes: Optional[str] = None
    status: Optional[KPIStatus] = None
    priority: Optional[KPIPriority] = None
    tags: Optional[List[str]] = None


class KPIResponse(KPIBase):
    """Schema for KPI response."""

    id: str
    project_id: str
    status: KPIStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# === GitHub Discovery Schemas ===


class KPIDiscoveryRequest(BaseModel):
    """Schema for GitHub KPI discovery request."""

    focus_categories: List[str] = Field(
        default_factory=list,
        description="Categories to focus on (e.g., 'efficiency', 'revenue', 'adoption')"
    )
    user_context: Optional[str] = Field(
        default=None,
        max_length=2000,
        description="Optional guidance (e.g., 'Focus on customer value metrics')"
    )
    auth_token: Optional[str] = Field(
        default=None,
        description="GitHub OAuth token for private repositories"
    )


class CandidateKPI(BaseModel):
    """A candidate KPI from discovery."""

    temp_id: str
    name: str
    definition: str
    category: str  # efficiency, quality, adoption, revenue, satisfaction, growth, operational
    calculation_method: str
    data_sources: List[str] = []
    unit: Optional[str] = None
    frequency: str  # daily, weekly, monthly, quarterly
    target_guidance: Optional[str] = None
    business_value: str
    priority: str  # low, medium, high, critical
    priority_score: int = Field(ge=1, le=100)
    impact_areas: List[str] = []


class KPIBatchCreateRequest(BaseModel):
    """Schema for batch creating KPIs from discovery."""

    kpis: List[CandidateKPI]


class KPIBatchCreateResponse(BaseModel):
    """Schema for batch creation response."""

    created: List[KPIResponse]
    count: int
