"""
GET /health — Health check endpoint.
"""

from fastapi import APIRouter

from app.config import get_settings
from app.models import HealthResponse
from app.services.cache_service import cache_service

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Return service health including Redis connectivity."""
    settings = get_settings()
    return HealthResponse(
        status="ok",
        service=settings.APP_NAME,
        version=settings.APP_VERSION,
        redis_connected=cache_service.is_connected,
    )
