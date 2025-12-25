"""
User models for authentication.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import Column, String, DateTime, Boolean, Integer
from sqlalchemy.sql import func

from app.db.base import Base


class User(Base):
    """SQLAlchemy User model for database storage."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # AI usage quotas
    daily_ai_requests = Column(Integer, default=0)
    daily_ai_limit = Column(Integer, default=100)
    last_request_date = Column(DateTime(timezone=True), nullable=True)


# Pydantic models for API
class UserBase(BaseModel):
    """Base user schema."""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)


class UserCreate(UserBase):
    """Schema for user registration."""
    password: str = Field(..., min_length=8, max_length=100)


class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Schema for user response (excludes sensitive data)."""
    id: int
    email: EmailStr
    username: str
    is_active: bool
    is_verified: bool
    created_at: datetime
    daily_ai_requests: int
    daily_ai_limit: int

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """Schema for token response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class TokenRefreshRequest(BaseModel):
    """Schema for token refresh."""
    refresh_token: str
