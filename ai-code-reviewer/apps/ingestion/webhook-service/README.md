# Webhook Service

The Webhook Service is the entry point for all SCM events in the AI Code Reviewer platform. It lives in the **Ingestion Domain** and is the only service that communicates directly with GitHub and GitLab APIs.

---

## ⚡ Key Features

- **HMAC-SHA256 Signature Validation**: Guards on every endpoint verify the `X-Hub-Signature-256` (GitHub) or `X-Gitlab-Token` (GitLab) header before any payload is processed. Uses `timingSafeEqual` to prevent timing attacks.
- **Immediate 200 Ack**: Controllers respond `{ received: true }` before doing any file fetching, satisfying GitHub's 10-second webhook timeout. All heavy work is async.
- **GitHub App Installation Tokens**: Authenticates SCM API calls using short-lived installation tokens generated from a GitHub App private key (RS256 JWT). Tokens are cached in-process and reused until 60 seconds before expiry — no Redis dependency.
- **Full File Content Fetch**: On merge events, fetches the complete content of every changed file from the SCM API (not just the diff), producing a `MergedPREvent` that the Code Indexer can parse immediately without a separate fetch step.
- **Unified Event Schema**: All SCM providers are normalised to the shared `PREvent` / `MergedPREvent` types from `@ai-code-reviewer/types` before publishing. Downstream services never see raw vendor payloads.
- **Stateless**: No database. Scales horizontally with zero config changes.

---

## 🏗️ Architecture

```
POST /webhooks/github  ──► GithubSignatureGuard (HMAC-SHA256)
                               │
                           WebhooksController (200 OK immediately)
                               │ async
                           WebhooksService.processGithubEvent()
                               ├── GithubNormalizer (PREvent + isMerge flag)
                               ├── GithubAppService (JWT → installation token, cached)
                               ├── GithubApiClient (GET /pulls/:n/files + raw content)
                               └── KafkaProducerService
                                     ├── pr.events.merged  (MergedPREvent, if merged)
                                     └── pr.events.raw     (PREvent, if opened/updated)

POST /webhooks/gitlab  ──► GitlabSignatureGuard (X-Gitlab-Token)
                               │ (same async pattern via GitlabNormalizer + GitlabApiClient)
```

**Tech stack**: NestJS · KafkaJS · Axios · Node.js `crypto` (no extra JWT library)

---

## 🔄 Event Flow

### Merged PR (triggers Code Indexer)

1. GitHub sends `pull_request` webhook with `action: closed` and `merged: true`
2. Guard validates HMAC-SHA256 signature — rejects with 401 if invalid
3. Controller returns `200 OK` immediately
4. Service detects merge, calls `GithubAppService.getInstallationToken(installationId)`:
   - Signs an RS256 JWT with the App private key (10-minute TTL)
   - Exchanges it for an installation access token via `POST /app/installations/:id/access_tokens`
   - Caches the token in-process, reuses until 60 s before expiry
5. `GithubApiClient.getPRFiles()` paginates `GET /repos/:owner/:repo/pulls/:n/files` and fetches raw content for each non-removed file
6. Emits `MergedPREvent` (including full file contents) to `pr.events.merged`
7. Code Indexer consumes the event and runs the full AST parse → embed → graph pipeline

### Opened / Updated PR (triggers Temporal)

Steps 1–3 same as above, then:

4. Service normalises to `PREvent` with `action: opened | updated`
5. Emits to `pr.events.raw`
6. Temporal Worker (Orchestration domain) consumes and orchestrates the analysis workflow

---

## 🛠️ API Endpoints

| Method | Endpoint           | Auth                   | Description                              |
|--------|--------------------|------------------------|------------------------------------------|
| POST   | `/webhooks/github` | `X-Hub-Signature-256`  | Receives GitHub `pull_request` events    |
| POST   | `/webhooks/gitlab` | `X-Gitlab-Token`       | Receives GitLab `merge_request` events   |
| GET    | `/health`          | None                   | Liveness check → `{ status: 'ok' }`     |

---

## ⚙️ Configuration

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3002` | HTTP listen port |
| `KAFKA_BROKERS` | `kafka:29092` | Kafka broker addresses (comma-separated) |
| `KAFKA_CLIENT_ID` | `webhook-service-client` | Kafka producer client ID |
| `GITHUB_WEBHOOK_SECRET` | — | Secret configured in the GitHub App webhook settings |
| `GITHUB_APP_ID` | — | Numeric GitHub App ID |
| `GITHUB_APP_PRIVATE_KEY` | — | Base64-encoded PEM private key (`base64 -w 0 private-key.pem`) |
| `GITLAB_WEBHOOK_SECRET` | — | Token configured in the GitLab webhook settings |
| `GITLAB_TOKEN` | — | GitLab project or group token for fetching MR diffs |
| `GITLAB_URL` | `https://gitlab.com` | Override for self-hosted GitLab instances |

---

## 🔑 GitHub App Setup

1. Create a GitHub App at `https://github.com/settings/apps/new`
2. Set the webhook URL to `https://<your-host>/webhooks/github`
3. Set a webhook secret and copy it to `GITHUB_WEBHOOK_SECRET`
4. Generate a private key, base64-encode it, and set `GITHUB_APP_PRIVATE_KEY`
5. Copy the App ID (shown on the app settings page) to `GITHUB_APP_ID`
6. Subscribe to **Pull requests** events
7. Install the App on your organisation or repository

---

## 🧩 Adding a New SCM Provider

1. Add a signature guard in `src/app/webhooks/guards/`
2. Add a normalizer in `src/app/webhooks/normalizers/` implementing `normalize(payload): NormalizeResult`
3. Add an API client in `src/app/webhooks/scm-clients/` to fetch changed file content
4. Add a handler in `WebhooksController` and wire the new guard + service call in `WebhooksService`
5. Register providers in `WebhooksModule`

The `PREvent` / `MergedPREvent` schemas are the stable contract — no downstream service changes are needed.
