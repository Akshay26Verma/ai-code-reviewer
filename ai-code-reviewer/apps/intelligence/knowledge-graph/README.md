# Knowledge Graph Service

The Knowledge Graph is a core microservice in the Intelligence Domain. It serves as the **single source of truth for all Neo4j graph operations** in the AI Code Reviewer platform.

By centralizing all Neo4j writes into this single service, we eliminate distributed locking complexities, race conditions, and split-brain risks that would occur if multiple services attempted to write graph patches simultaneously.

---

## ⚡ Features

- **Single Graph Writer**: The only service holding a direct `neo4j-driver` connection for executing write transactions (`POST /graph/patch`).
- **Graph Queries**: Exposes endpoints for calculating code blast radius, historical bug density (risk), caller traces, and module dependencies.
- **Caching Layer**: Utilizes a shared Redis cluster (`kg:cache:*` namespace) with a 60-second TTL to accelerate query resolution and reduce database load.
- **O(1) File Deletion Support**: Supports batched node deletions by file path during graph patching, running highly optimized Neo4j Cypher unwinding queries under the hood:
  ```cypher
  UNWIND $filePaths AS filePath
  MATCH (n {file_path: filePath, repo_id: $repoId})
  DETACH DELETE n
  ```

---

## 🏗️ Architecture

This service is built using:
- **NestJS**: Framework for HTTP routing and dependency injection.
- **Neo4j Official Driver**: For executing Cypher queries.
- **Redis (ioredis)**: For query caching.
- **Zod**: For strict validation of graph patch payloads coming from the Code Indexer.

---

## 🛠️ API Endpoints

| Method | Endpoint                        | Description                                                                 |
|--------|---------------------------------|-----------------------------------------------------------------------------|
| POST   | `/graph/patch`                  | (Internal) Accepts and applies AST edge updates & file/node deletions.      |
| GET    | `/graph/callers/:fnId`          | Returns all functions that call a given function.                           |
| GET    | `/graph/dependencies/:moduleId` | Returns all dependencies for a specific module.                             |
| GET    | `/graph/impact/:fnId`           | Calculates blast radius (affected downstream dependencies) of a function.   |
| GET    | `/graph/risk/*filePath`         | Returns historical bug density for a given file path.                       |
| GET    | `/graph/recent-changes/:repoId` | Returns the latest changed files in a specific repository.                  |
| GET    | `/health`                       | Health check endpoint, including Neo4j and Redis connection statuses.       |

---

## ⚙️ Configuration

The service connects to infrastructure using environment variables:

- `NEO4J_URI` / `NEO4J_USER` / `NEO4J_PASSWORD`
- `REDIS_URL` (default: `redis://localhost:6379/0`)
- `KG_CACHE_TTL` (default: 60 seconds)
