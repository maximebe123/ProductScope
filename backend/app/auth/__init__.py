"""
Authentication module for ProductScope.
Provides JWT-based authentication and authorization.
"""

from .jwt import create_access_token, create_refresh_token, verify_token, TokenData
from .middleware import get_current_user, get_current_user_optional, require_auth
from .models import User, UserCreate, UserLogin, UserResponse, TokenResponse

__all__ = [
    # JWT utilities
    "create_access_token",
    "create_refresh_token",
    "verify_token",
    "TokenData",
    # Middleware
    "get_current_user",
    "get_current_user_optional",
    "require_auth",
    # Models
    "User",
    "UserCreate",
    "UserLogin",
    "UserResponse",
    "TokenResponse",
]
