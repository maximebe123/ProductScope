"""FastAPI application entry point for ProductScope AI Backend"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.api.routes import health

# Import module routers (existing AI endpoints)
from app.modules.diagrams import router as diagrams_router
from app.modules.mindmap import router as mindmap_router
from app.modules.flowchart import router as flowchart_router

# Import new project/persistence routers
from app.api.routes import projects, visualizations, chat, stories, transcripts, questions, decisions, github, features, kpis, user_journeys

# Import authentication module
from app.auth.routes import router as auth_router
from app.auth.models import User as AuthUser

# Database imports
from app.db.session import engine
from app.db.base import Base

# Configure logging to both console and file
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("/Users/maxime/Documents/Code/RDiagrams/backend/app.log")
    ]
)
logger = logging.getLogger(__name__)

# Configure rate limiting
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info("ProductScope AI Backend starting up")
    logger.info(f"CORS origins: {settings.cors_origins_list}")
    logger.info("Registered modules: diagrams, mindmap, flowchart")
    logger.info(f"Database URL: {settings.DATABASE_URL.split('@')[1] if '@' in settings.DATABASE_URL else 'configured'}")

    # Create database tables (dev only - use Alembic in production)
    async with engine.begin() as conn:
        # Import all models to register them
        from app.models import (
            Project, DiagramEntity, ChatMessage, Transcript,
            Story, Question, Decision, Feature, KPI, Export, Activity
        )
        await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created/verified")

    yield

    # Shutdown
    logger.info("ProductScope AI Backend shutting down")
    await engine.dispose()
    logger.info("Database connections closed")


# Create FastAPI app
app = FastAPI(
    title="ProductScope AI Backend",
    description="AI-powered product building platform",
    version="1.0.0",
    lifespan=lifespan,
)

# Add rate limiter to app state and register exception handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# Custom validation error handler to log details
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    body = await request.body()
    logger.error(f"Validation error for request body: {body.decode()[:500]}...")
    logger.error(f"Validation errors: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )


# Configure CORS with restricted methods and headers
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept"],
)

# =====================================================
# Core Routes (shared across all modules)
# =====================================================
app.include_router(health.router, tags=["Health"])

# =====================================================
# Module Routes
# =====================================================

# Diagrams module - AI-powered architecture diagrams
# Routes: /api/diagrams/*
app.include_router(diagrams_router, prefix="/api/diagrams")

# Mind Map module - AI-powered brainstorming
# Routes: /api/mindmap/*
app.include_router(mindmap_router, prefix="/api/mindmap")

# Flowchart module - AI-powered Mermaid.js flowcharts
# Routes: /api/flowchart/*
app.include_router(flowchart_router, prefix="/api/flowchart")

# =====================================================
# Project Persistence Routes (new)
# =====================================================

# Projects CRUD
# Routes: /api/projects/*
app.include_router(projects.router, prefix="/api")

# Visualizations (diagrams within projects)
# Routes: /api/projects/{project_id}/diagrams/*
app.include_router(visualizations.router, prefix="/api")

# Chat history
# Routes: /api/projects/{project_id}/chat, /api/projects/{project_id}/diagrams/{diagram_id}/chat
app.include_router(chat.router, prefix="/api")

# Stories
# Routes: /api/projects/{project_id}/stories/*
app.include_router(stories.router, prefix="/api")

# Transcripts
# Routes: /api/projects/{project_id}/transcripts/*
app.include_router(transcripts.router, prefix="/api")

# Questions
# Routes: /api/projects/{project_id}/questions/*
app.include_router(questions.router, prefix="/api")

# Decisions
# Routes: /api/projects/{project_id}/decisions/*
app.include_router(decisions.router, prefix="/api")

# Features
# Routes: /api/projects/{project_id}/features/*
app.include_router(features.router, prefix="/api")

# KPIs
# Routes: /api/projects/{project_id}/kpis/*
app.include_router(kpis.router, prefix="/api")

# User Journeys
# Routes: /api/projects/{project_id}/journeys/*
app.include_router(user_journeys.router, prefix="/api")

# =====================================================
# GitHub Import Routes
# =====================================================

# GitHub Import (SSE streaming)
# Routes: /api/github/*
app.include_router(github.router, prefix="/api")
