"""
POST /complete — LLM completion with multi-model routing.
"""

import logging
from fastapi import APIRouter, HTTPException

from app.models import CompletionRequest, CompletionResponse
from app.services.llm_service import llm_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/complete", response_model=CompletionResponse)
async def complete(request: CompletionRequest) -> CompletionResponse:
    """
    Route an LLM completion request based on task_type.
    Checks cache first, falls back to LiteLLM with provider fallback chains.
    """
    try:
        return await llm_service.complete(request)
    except Exception as e:
        logger.error("Completion failed: %s", e)
        raise HTTPException(status_code=502, detail=f"LLM completion failed: {str(e)}")
