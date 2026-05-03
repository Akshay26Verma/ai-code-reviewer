"""
POST /embed — Generate embeddings via LiteLLM.
"""

import logging
from fastapi import APIRouter, HTTPException

from app.models import EmbedRequest, EmbedResponse
from app.services.llm_service import llm_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/embed", response_model=EmbedResponse)
async def embed(request: EmbedRequest) -> EmbedResponse:
    """Generate vector embeddings for the provided texts."""
    try:
        return await llm_service.embed(request)
    except Exception as e:
        logger.error("Embedding failed: %s", e)
        raise HTTPException(status_code=502, detail=f"Embedding failed: {str(e)}")
