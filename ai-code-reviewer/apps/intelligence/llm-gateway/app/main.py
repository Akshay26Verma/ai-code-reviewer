"""
LLM Gateway — FastAPI application entry point.

The only Python service in the AI Code Reviewer stack.
All TypeScript services call this over HTTP.
Docker-isolated with its own container.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.services.cache_service import cache_service
from app.services.llm_service import llm_service
from app.routes import complete, embed, models_route, health

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage startup and shutdown lifecycle events."""
    settings = get_settings()
    logger.info("Starting %s v%s", settings.APP_NAME, settings.APP_VERSION)

    # Startup: connect Redis and load routing config
    await cache_service.connect()
    llm_service.load_routing_config()

    logger.info("LLM Gateway ready — provider=%s, model=%s", settings.LLM_PROVIDER, settings.LLM_MODEL)
    yield

    # Shutdown: disconnect Redis
    await cache_service.disconnect()
    logger.info("LLM Gateway shut down")


def create_app() -> FastAPI:
    """Application factory."""
    settings = get_settings()

    app = FastAPI(
        title="AI Code Reviewer — LLM Gateway",
        description="Unified LLM interface with multi-model routing, fallback chains, and response caching.",
        version=settings.APP_VERSION,
        lifespan=lifespan,
    )

    # CORS — allow all TS services in the monorepo to call this
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register routes
    app.include_router(complete.router, tags=["Completion"])
    app.include_router(embed.router, tags=["Embedding"])
    app.include_router(models_route.router, tags=["Models"])
    app.include_router(health.router, tags=["Health"])

    return app


app = create_app()
