"""
Centralized configuration for the LLM Gateway.

ALL provider keys, model settings, and infrastructure config live here.
To switch providers or update keys, only modify the .env file — zero code changes needed.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """
    Single source of truth for all configuration.
    Every value is read from environment variables (or .env file).
    """

    # ── App ──────────────────────────────────────────────────────────
    APP_NAME: str = "llm-gateway"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False

    # ── LLM Provider (change ONLY these to switch providers) ────────
    LLM_PROVIDER: str = "groq"              # groq | openai | anthropic | azure | etc.
    LLM_MODEL: str = "llama-3.1-8b-instant" # default model for simple tasks
    LLM_API_KEY: str = "sk-mock-key-replace-me"

    # ── Optional: provider-specific keys (LiteLLM reads these) ──────
    OPENAI_API_KEY: str = "sk-mock-openai-key"
    ANTHROPIC_API_KEY: str = "sk-mock-anthropic-key"
    GROQ_API_KEY: str = "sk-mock-groq-key"

    # ── Model versioning (used in cache key for auto-invalidation) ──
    MODEL_VERSION: str = "v1"

    # ── Redis (shared instance, namespaced with key prefix) ─────────
    REDIS_URL: str = "redis://localhost:6379/0"
    CACHE_TTL_SECONDS: int = 3600  # 1 hour default
    CACHE_KEY_PREFIX: str = "llm-gw:cache"

    # ── Routing config path ─────────────────────────────────────────
    ROUTING_CONFIG_PATH: str = "app/routing.yaml"

    # ── Server ──────────────────────────────────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance — created once, reused everywhere."""
    return Settings()
