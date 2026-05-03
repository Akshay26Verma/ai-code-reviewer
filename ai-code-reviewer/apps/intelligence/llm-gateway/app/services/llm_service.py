"""
LLM service wrapping LiteLLM with multi-model routing and fallback chains.

Routing logic:
  - Reads routing.yaml to determine which model to use per task_type
  - If primary provider fails, automatically retries with the fallback
  - All provider keys come from environment variables (config.py)
"""

import json
import logging
from pathlib import Path
from typing import Optional

import yaml
import litellm
from litellm import acompletion, aembedding

from app.config import get_settings
from app.models import TaskType, CompletionRequest, CompletionResponse, EmbedRequest, EmbedResponse
from app.services.cache_service import cache_service

logger = logging.getLogger(__name__)

# Suppress LiteLLM's verbose logging in non-debug mode
litellm.suppress_debug_info = True


class LLMService:
    """Core LLM wrapper with routing, fallback, and caching."""

    def __init__(self) -> None:
        self._routing_config: dict = {}

    def load_routing_config(self) -> None:
        """Load multi-model routing from routing.yaml."""
        settings = get_settings()
        config_path = Path(settings.ROUTING_CONFIG_PATH)
        if config_path.exists():
            with open(config_path, "r") as f:
                self._routing_config = yaml.safe_load(f) or {}
            logger.info("Loaded routing config from %s", config_path)
        else:
            logger.warning("routing.yaml not found at %s — using defaults", config_path)
            self._routing_config = {}

    def reload_routing_config(self) -> None:
        """Hot-reload routing config without restart."""
        self.load_routing_config()

    def get_model_for_task(self, task_type: TaskType) -> tuple[str, Optional[str]]:
        """
        Returns (primary_model, fallback_model) for a given task type.
        Model strings are in LiteLLM format: "provider/model_name"
        """
        task_routes = self._routing_config.get("task_types", {})
        route = task_routes.get(task_type.value, {})

        primary = route.get("primary", {})
        fallback = route.get("fallback", {})

        settings = get_settings()

        primary_model = (
            f"{primary['provider']}/{primary['model']}"
            if primary.get("provider") and primary.get("model")
            else f"{settings.LLM_PROVIDER}/{settings.LLM_MODEL}"
        )

        fallback_model = (
            f"{fallback['provider']}/{fallback['model']}"
            if fallback.get("provider") and fallback.get("model")
            else None
        )

        return primary_model, fallback_model

    def get_all_routes(self) -> list[dict]:
        """Return all configured routes for the /models endpoint."""
        task_routes = self._routing_config.get("task_types", {})
        result = []
        for task_type, route in task_routes.items():
            primary = route.get("primary", {})
            fallback = route.get("fallback", {})
            result.append({
                "task_type": task_type,
                "primary_provider": primary.get("provider", "unknown"),
                "primary_model": primary.get("model", "unknown"),
                "fallback_provider": fallback.get("provider"),
                "fallback_model": fallback.get("model"),
            })
        return result

    async def complete(self, request: CompletionRequest) -> CompletionResponse:
        """
        Execute an LLM completion with routing, caching, and fallback.
        """
        # Build cache key from the serialized messages
        prompt_data = json.dumps(
            [{"role": m.role, "content": m.content} for m in request.messages],
            sort_keys=True,
        )

        # Check cache first
        cached = await cache_service.get(request.repo_id, prompt_data)
        if cached:
            return CompletionResponse(**cached, cached=True)

        # Determine model routing
        primary_model, fallback_model = self.get_model_for_task(request.task_type)
        messages = [{"role": m.role, "content": m.content} for m in request.messages]

        # Try primary model
        try:
            response = await acompletion(
                model=primary_model,
                messages=messages,
            )
            result = self._parse_completion_response(response, primary_model)

        except Exception as primary_error:
            logger.warning(
                "Primary model %s failed: %s — trying fallback",
                primary_model, primary_error,
            )

            if not fallback_model:
                raise primary_error

            # Try fallback model
            try:
                response = await acompletion(
                    model=fallback_model,
                    messages=messages,
                )
                result = self._parse_completion_response(response, fallback_model)

            except Exception as fallback_error:
                logger.error(
                    "Fallback model %s also failed: %s",
                    fallback_model, fallback_error,
                )
                raise fallback_error

        # Cache the successful response
        cache_data = result.model_dump()
        cache_data.pop("cached", None)
        await cache_service.set(request.repo_id, prompt_data, cache_data)

        return result

    async def embed(self, request: EmbedRequest) -> EmbedResponse:
        """Generate embeddings via LiteLLM."""
        settings = get_settings()

        try:
            response = await aembedding(
                model=f"{settings.LLM_PROVIDER}/text-embedding-3-small",
                input=request.texts,
            )

            embeddings = [item["embedding"] for item in response.data]
            return EmbedResponse(
                embeddings=embeddings,
                model=response.model or "text-embedding-3-small",
            )

        except Exception as e:
            logger.error("Embedding failed: %s", e)
            raise

    def _parse_completion_response(self, response, model_str: str) -> CompletionResponse:
        """Extract a clean CompletionResponse from a LiteLLM response."""
        provider, model_name = model_str.split("/", 1)
        content = response.choices[0].message.content or ""
        usage = {}
        if response.usage:
            usage = {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens,
            }

        return CompletionResponse(
            content=content,
            model=model_name,
            provider=provider,
            usage=usage,
            cached=False,
        )


# Singleton instance
llm_service = LLMService()
