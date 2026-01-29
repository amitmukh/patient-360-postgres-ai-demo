"""
Patient 360 Backend - Health Check Route
"""

from fastapi import APIRouter

from app.db import execute_scalar
from app.settings import get_settings
from app.schemas import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """
    Health check endpoint.
    
    Returns the status of the API and its dependencies.
    """
    settings = get_settings()
    
    # Check database connection
    db_status = "unknown"
    try:
        result = await execute_scalar("SELECT 1")
        if result == 1:
            db_status = "healthy"
        else:
            db_status = "unhealthy: unexpected result"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
    
    # Check Azure AI configuration
    azure_ai_status = "configured" if settings.azure_ai_endpoint else "not configured"
    
    # Check Azure OpenAI configuration
    azure_openai_status = "configured" if settings.has_azure_openai else "not configured"
    
    return HealthResponse(
        status="healthy" if db_status == "healthy" else "degraded",
        database=db_status,
        azure_ai=azure_ai_status,
        azure_openai=azure_openai_status,
        version="1.0.0"
    )
