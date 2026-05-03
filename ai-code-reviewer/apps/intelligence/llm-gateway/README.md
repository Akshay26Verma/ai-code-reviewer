# LLM Gateway

The only Python service in the AI Code Reviewer stack. Provides a unified HTTP API for LLM completions and embeddings, with multi-model routing and response caching.

## Quick Start

```bash
# 1. Copy environment config
cp .env.example .env

# 2. Update your API keys in .env
#    (only the providers you plan to use)

# 3. Start with Docker Compose
docker compose up --build

# 4. Verify
curl http://localhost:8000/health
curl http://localhost:8000/models
```

## API Endpoints

| Method | Endpoint    | Description                           |
|--------|-------------|---------------------------------------|
| POST   | `/complete` | LLM completion with multi-model routing |
| POST   | `/embed`    | Generate text embeddings              |
| GET    | `/models`   | List routing config                   |
| GET    | `/health`   | Health check                          |

## Configuration

**All configuration lives in `.env`** — this is the only file you need to edit.

- `LLM_PROVIDER` / `LLM_MODEL` — default provider and model
- `GROQ_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` — provider keys
- `MODEL_VERSION` — bump to invalidate cache after a model upgrade
- `REDIS_URL` — shared Redis connection

## Multi-Model Routing

Edit `app/routing.yaml` to configure which model handles each task type:

- **simple** → fast, cheap (e.g., Llama 3.1 8B)
- **deep_reasoning** → powerful (e.g., Llama 3.1 70B)  
- **production** → best quality (e.g., Claude Sonnet, GPT-4o)

Routing config is hot-reloadable — no restart needed.

## Architecture

- **FastAPI** — async REST interface
- **LiteLLM** — 100+ provider unified interface with fallback chains
- **Redis** — response cache with `sha256(repo_id:model_version:prompt)` keying
- **Docker** — fully isolated, TS services call via HTTP only
