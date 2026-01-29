"""
Patient 360 Backend - Main Application Entry Point
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import init_db_pool, close_db_pool
from app.settings import get_settings
from app.routes import health, patients, ingest, copilot, actions

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    logger.info("Starting Patient 360 API...")
    await init_db_pool()
    logger.info("Application started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Patient 360 API...")
    await close_db_pool()
    logger.info("Application shutdown complete")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()
    
    app = FastAPI(
        title=settings.app_name,
        description="PHI-safe Copilot powered by Azure Database for PostgreSQL AI",
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )
    
    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Include routers
    app.include_router(health.router, tags=["Health"])
    app.include_router(patients.router, prefix="/patients", tags=["Patients"])
    app.include_router(ingest.router, prefix="/patients", tags=["Ingestion"])
    app.include_router(copilot.router, prefix="/patients", tags=["Copilot"])
    app.include_router(actions.router, prefix="/patients", tags=["Actions"])
    
    return app


# Create application instance
app = create_app()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
