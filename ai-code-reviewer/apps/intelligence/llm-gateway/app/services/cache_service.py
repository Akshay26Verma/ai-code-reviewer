"""
Redis-backed response cache for the LLM Gateway.

Cache key formula from HLD:
    sha256(repo_id + ":" + model_version + ":" + normalized_prompt)

- repo_id scoping prevents cross-repo cache contamination
- model_version ensures a provider upgrade invalidates stale cached responses
- Key prefix (llm-gw:cache) namespaces within the shared Redis instance
"""

import hashlib
import json
import logging
from typing import Optional

import redis.asyncio as redis

from app.config import get_settings

logger = logging.getLogger(__name__)


class CacheService:
    """Async Redis cache with sha256-based keying."""

    def __init__(self) -> None:
        self._client: Optional[redis.Redis] = None

    async def connect(self) -> None:
        """Initialize Redis connection."""
        settings = get_settings()
        try:
            self._client = redis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
            )
            await self._client.ping()
            logger.info("Redis connected at %s", settings.REDIS_URL)
        except Exception as e:
            logger.warning("Redis connection failed: %s — caching disabled", e)
            self._client = None

    async def disconnect(self) -> None:
        """Close Redis connection."""
        if self._client:
            await self._client.aclose()
            logger.info("Redis disconnected")

    @property
    def is_connected(self) -> bool:
        return self._client is not None

    def _build_key(self, repo_id: str, prompt_data: str) -> str:
        """
        Build cache key: prefix:sha256(repo_id:model_version:normalized_prompt)
        """
        settings = get_settings()
        raw = f"{repo_id}:{settings.MODEL_VERSION}:{prompt_data}"
        digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()
        return f"{settings.CACHE_KEY_PREFIX}:{digest}"

    async def get(self, repo_id: str, prompt_data: str) -> Optional[dict]:
        """Retrieve cached response. Returns None on miss or if Redis is down."""
        if not self._client:
            return None
        key = self._build_key(repo_id, prompt_data)
        try:
            cached = await self._client.get(key)
            if cached:
                logger.debug("Cache HIT: %s", key[:32])
                return json.loads(cached)
            logger.debug("Cache MISS: %s", key[:32])
            return None
        except Exception as e:
            logger.warning("Cache read error: %s", e)
            return None

    async def set(self, repo_id: str, prompt_data: str, response: dict) -> None:
        """Store response in cache with TTL."""
        if not self._client:
            return
        settings = get_settings()
        key = self._build_key(repo_id, prompt_data)
        try:
            await self._client.set(
                key,
                json.dumps(response),
                ex=settings.CACHE_TTL_SECONDS,
            )
            logger.debug("Cache SET: %s (TTL=%ds)", key[:32], settings.CACHE_TTL_SECONDS)
        except Exception as e:
            logger.warning("Cache write error: %s", e)


# Singleton instance
cache_service = CacheService()
