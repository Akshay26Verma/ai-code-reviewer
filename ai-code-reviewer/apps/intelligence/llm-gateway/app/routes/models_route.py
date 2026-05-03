"""
GET /models — List available models and routing configuration.
"""

from fastapi import APIRouter

from app.models import ModelsResponse, ModelInfo
from app.services.llm_service import llm_service

router = APIRouter()


@router.get("/models", response_model=ModelsResponse)
async def list_models() -> ModelsResponse:
    """Return current routing configuration showing model assignments per task type."""
    routes = llm_service.get_all_routes()
    models = [ModelInfo(**route) for route in routes]
    return ModelsResponse(models=models)
