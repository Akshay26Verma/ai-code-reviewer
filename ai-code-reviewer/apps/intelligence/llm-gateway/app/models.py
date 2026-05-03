"""
Pydantic v2 request/response models for the LLM Gateway API.
These are the contracts that all TypeScript services will interact with over HTTP.
"""

from enum import Enum
from pydantic import BaseModel, Field


# ── Enums ────────────────────────────────────────────────────────────

class TaskType(str, Enum):
    """
    Maps to the multi-model routing in routing.yaml.
    simple       → fast, cheap model (e.g., Llama 3.1 8B)
    deep_reasoning → powerful model (e.g., Llama 3.1 70B)
    production   → best quality (e.g., Claude Sonnet, GPT-4o)
    """
    SIMPLE = "simple"
    DEEP_REASONING = "deep_reasoning"
    PRODUCTION = "production"


# ── Chat Messages ────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str = Field(..., description="One of: system, user, assistant")
    content: str = Field(..., description="Message content")


# ── /complete ────────────────────────────────────────────────────────

class CompletionRequest(BaseModel):
    task_type: TaskType = Field(..., description="Determines which model to route to")
    repo_id: str = Field(..., description="Repository ID — used for cache scoping")
    messages: list[ChatMessage] = Field(..., description="Chat messages for the LLM")
    stream: bool = Field(default=False, description="Enable streaming response")


class CompletionResponse(BaseModel):
    content: str = Field(..., description="LLM response text")
    model: str = Field(..., description="Model that generated the response")
    provider: str = Field(..., description="Provider used (groq, openai, etc.)")
    usage: dict = Field(default_factory=dict, description="Token usage stats")
    cached: bool = Field(default=False, description="Whether this was served from cache")


# ── /embed ───────────────────────────────────────────────────────────

class EmbedRequest(BaseModel):
    repo_id: str = Field(..., description="Repository ID for cache scoping")
    texts: list[str] = Field(..., description="Texts to generate embeddings for")


class EmbedResponse(BaseModel):
    embeddings: list[list[float]] = Field(..., description="Embedding vectors")
    model: str = Field(..., description="Embedding model used")


# ── /models ──────────────────────────────────────────────────────────

class ModelInfo(BaseModel):
    task_type: str
    primary_provider: str
    primary_model: str
    fallback_provider: str | None = None
    fallback_model: str | None = None


class ModelsResponse(BaseModel):
    models: list[ModelInfo]


# ── /health ──────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "llm-gateway"
    version: str = "0.1.0"
    redis_connected: bool = False
