"""
Diagrams Module
AI-powered architecture diagram generation and manipulation.
"""

from fastapi import APIRouter

# Import existing routes
from app.api.routes import generate, operations, realtime

# Create module router
router = APIRouter()

# Include all diagram-related routes under this module
router.include_router(generate.router, tags=["Diagrams - Generation"])
router.include_router(operations.router, tags=["Diagrams - Operations"])
router.include_router(realtime.router, tags=["Diagrams - Realtime"])
