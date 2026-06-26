# 🖥️ Dashboard

The human-facing UI for the AI Code Reviewer platform. A full-stack Next.js 14 App Router service that handles GitHub OAuth login, HS256 JWT issuance, and provides pages for PR reviews, developer/team insights, and manual analysis triggers.

---

## 🏗️ Architecture

This is a **single full-stack Next.js service** — there is no separate backend process.

| Layer | Location | Role |
|---|---|---|
| **Frontend** | `src/app/(dashboard)/` | React Server + Client Components, Tailwind UI |
| **Backend** | `src/app/api/` | Next.js Route Handlers — OAuth + api-gateway proxy |
| **Auth** | `src/app/api/auth/[...nextauth]/` | NextAuth v5 (Auth.js) with GitHub provider |
| **Lib** | `src/lib/` | JWT minting, server-side api-gateway client, auth config |

The dashboard proxies all business logic to the **api-gateway** (port 3003). It does not read from Postgres directly.

---

## 🔐 Auth Flow

```
User → GitHub OAuth → NextAuth callback
  → mint HS256 API token (sub=githubId, login, exp)
  → store in encrypted NextAuth session cookie (httpOnly)
  → attach as Authorization: Bearer on all api-gateway calls
```

The minted token is verified by the api-gateway `JwtGuard` using the **shared `JWT_SECRET`**. Both services must have the same value for `JWT_SECRET`.

---

## 📋 Pages

| Route | Description |
|---|---|
| `/login` | GitHub OAuth sign-in |
| `/prs` | PR lookup form |
| `/prs/:prId` | Review detail with inline diff comments |
| `/insights/developer/:id` | Developer-level insights (stub until Aggregator is built) |
| `/insights/team/:id` | Team summary (stub until Aggregator is built) |

---

## 🔌 API Routes (Next.js proxy handlers)

| Method | Path | Proxies to |
|---|---|---|
| `GET/POST` | `/api/auth/[...nextauth]` | NextAuth handler (internal) |
| `POST` | `/api/analyze` | `POST api-gateway/analyze` |
| `GET` | `/api/reviews/:prId` | `GET api-gateway/reviews/:prId` |
| `GET` | `/api/insights/:type/:id` | `GET api-gateway/insights/:type/:id` |
| `POST` | `/api/index/:repoId` | `POST api-gateway/index/:repoId/reindex` |

---

## 🚀 Running Locally

```bash
# 1. Copy and fill in env
cp apps/ingestion/dashboard/.env.example apps/ingestion/dashboard/.env
# Fill in GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, NEXTAUTH_SECRET

# 2. Register a GitHub OAuth App
#    - Homepage URL: http://localhost:3004
#    - Callback URL: http://localhost:3004/api/auth/callback/github

# 3. Start dependencies
docker compose up kafka redis postgres api-gateway -d

# 4. Serve the dashboard
npx nx run dashboard:serve
# → http://localhost:3004
```

---

## 🐳 Docker

```bash
docker compose up dashboard
```

---

## 🌐 Environment Variables

| Variable | Description |
|---|---|
| `PORT` | HTTP listen port (default `3004`) |
| `NEXTAUTH_URL` | Full public URL (e.g. `http://localhost:3004`) |
| `NEXTAUTH_SECRET` | Random secret for NextAuth session encryption (min 32 chars) |
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret |
| `JWT_SECRET` | **Must match `api-gateway` exactly** — HS256 signing key |
| `API_GATEWAY_URL` | api-gateway base URL (e.g. `http://api-gateway:3003` in Docker) |

---

## 🔑 JWT Token Format

The dashboard mints an HS256 JWT (`src/lib/jwt.ts`) compatible with the api-gateway `JwtGuard`:

```
base64url({ alg: "HS256", typ: "JWT" })
  . base64url({ sub: <githubId>, login: <login>, iat, exp })
  . HMAC-SHA256(header.payload, JWT_SECRET)
```

Token TTL: **24 hours**. Re-minted automatically in the NextAuth `jwt` callback when within 5 minutes of expiry.
