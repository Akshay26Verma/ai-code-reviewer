# 🚪 api-gateway

The HTTP-facing entry point for the AI Code Reviewer platform. Exposes REST endpoints for the dashboard, CI tools, and external consumers. Handles JWT authentication, Redis-backed rate limiting, and emits manual review triggers to Kafka.

## 📋 Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | None | Health check |
| `POST` | `/analyze` | JWT + RateLimit | Trigger a manual PR review |
| `GET` | `/reviews/:prId` | JWT | Fetch reviews for a PR |
| `GET` | `/insights/developer/:id` | JWT | Developer-level insights |
| `GET` | `/insights/team/:id` | JWT | Team-level summary |
| `POST` | `/index/:repoId/reindex` | JWT | Proxy reindex to code-indexer |

## 🔐 Authentication

All protected endpoints require a `Bearer` token in the `Authorization` header. Tokens are HS256 JWTs validated using Node.js `crypto` (no third-party JWT library).

**Generating a dev token** (Node.js REPL):
```js
const crypto = require('crypto');
const secret = 'dev-jwt-secret-change-in-production';
const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
const payload = Buffer.from(JSON.stringify({ sub: 'dev-user', exp: Math.floor(Date.now()/1000) + 3600 })).toString('base64url');
const sig = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
console.log(`${header}.${payload}.${sig}`);
```

## ⚡ Rate Limiting

`POST /analyze` enforces a sliding-window rate limit backed by Redis:
- Default: 100 requests per 60 seconds per IP
- Configured via `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW_MS`
- Returns `429 Too Many Requests` when exceeded

## 🗄️ Database

Uses Prisma ORM with PostgreSQL. Schema lives in `prisma/schema.prisma`.

```bash
# Generate Prisma client (from monorepo root)
npx prisma generate --schema=apps/ingestion/api-gateway/prisma/schema.prisma

# Run migrations
npx prisma migrate dev --schema=apps/ingestion/api-gateway/prisma/schema.prisma
```

## 📨 Kafka

Publishes to `pr.events.manual` when `POST /analyze` is called. The Temporal Worker (not yet built) consumes this topic to run the full analysis pipeline.

## 🚀 Running Locally

```bash
# Copy env
cp apps/ingestion/api-gateway/.env.example apps/ingestion/api-gateway/.env

# Start dependencies
docker compose up kafka redis postgres -d

# Run migrations
npx prisma migrate dev --schema=apps/ingestion/api-gateway/prisma/schema.prisma

# Serve
npx nx run api-gateway:serve
```

## 🐳 Docker

```bash
docker compose up api-gateway
```

## 🌐 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3003` | HTTP listen port |
| `KAFKA_BROKERS` | `localhost:9092` | Comma-separated Kafka brokers |
| `KAFKA_CLIENT_ID` | `api-gateway-client` | Kafka client ID |
| `JWT_SECRET` | — | HS256 signing secret (required) |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `RATE_LIMIT_MAX` | `100` | Max requests per window per IP |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window in ms |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `CODE_INDEXER_URL` | `http://localhost:3000` | code-indexer base URL |
