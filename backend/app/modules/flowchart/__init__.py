"""Flowchart Module Router"""

from fastapi import APIRouter

# Import route modules
from app.modules.flowchart.routes import operations

router = APIRouter()

# Include sub-routers
router.include_router(operations.router, tags=["Flowchart - Operations"])
