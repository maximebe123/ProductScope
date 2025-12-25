"""
Authentication middleware for FastAPI.
"""

from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from .jwt import verify_token, TokenData
from .models import User

# HTTP Bearer token scheme
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Get the current authenticated user.
    Raises 401 if not authenticated or token is invalid.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_data = verify_token(credentials.credentials, token_type="access")
    if token_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Fetch user from database
    result = await db.execute(
        select(User).where(User.id == token_data.user_id)
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )

    return user


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """
    Get the current user if authenticated, None otherwise.
    Does not raise errors for unauthenticated requests.
    """
    if credentials is None:
        return None

    token_data = verify_token(credentials.credentials, token_type="access")
    if token_data is None:
        return None

    result = await db.execute(
        select(User).where(User.id == token_data.user_id)
    )
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        return None

    return user


def require_auth(user: User = Depends(get_current_user)) -> User:
    """
    Dependency that requires authentication.
    Use this in route dependencies to protect endpoints.
    """
    return user


async def get_token_from_websocket(
    websocket_query_token: Optional[str] = None,
    websocket_header_token: Optional[str] = None,
) -> Optional[TokenData]:
    """
    Extract and verify token from WebSocket connection.
    Tokens can be passed via query parameter or Sec-WebSocket-Protocol header.
    """
    token = websocket_query_token or websocket_header_token
    if not token:
        return None

    return verify_token(token, token_type="access")


async def verify_websocket_token(
    token: str,
    db: AsyncSession,
) -> Optional[User]:
    """
    Verify WebSocket token and return user.
    """
    token_data = verify_token(token, token_type="access")
    if token_data is None:
        return None

    result = await db.execute(
        select(User).where(User.id == token_data.user_id)
    )
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        return None

    return user
