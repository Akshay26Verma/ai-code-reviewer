# AI Code Reviewer

An intelligent, multi-service platform designed for deep code analysis, knowledge extraction, and automated reviews. This project utilizes a modular, event-driven architecture powered by **Nx** and **NestJS**, integrating vector and graph databases to create a semantic understanding of complex codebases.

## 🏛️ Architecture Overview (The "Big Picture")

AI Code Reviewer is built as a high-performance **Nx Monorepo**, ensuring seamless integration between core services and shared logic.

The heart of the platform is the **Intelligence Domain**, which continuously indexes source code into both vector and graph representations. This "Deep Understanding" layer allows the analysis services to move beyond simple pattern matching, providing context-aware reviews that understand cross-file dependencies and logical flow.

### The Architectural Pivot
We have moved away from isolated service-specific LLM logic to a **Unified LLM Strategy**:
- **Bifrost Gateway**: A high-performance gateway providing standardized routing, caching, and rate-limiting for all LLM providers.
- **Shared LLM Client**: A centralized TypeScript package (`@ai-code-reviewer/llm-client`) that provides a task-based interface for all services, ensuring consistent model behavior across the entire platform.

---

## 🚀 Key Capabilities

- **Semantic Intelligence**: Deep LLM-powered reasoning using RAG (Retrieval-Augmented Generation) to understand code context and intent.
- **Structural Awareness**: Mapping relationships between code entities (classes, functions, modules) using **Neo4j** to perform impact and "blast-radius" analysis.
- **Durable Orchestration**: Reliable PR review lifecycles managed by **Temporal**, ensuring no review task is ever lost even during service failures.
- **Multi-SCM Integration**: Unified ingestion for GitHub, GitLab, and Bitbucket events.
- **O(1) Batched Deletions**: File removals are handled with single-query batched operations in both Pinecone (via `$in` filter) and Neo4j (via `UNWIND` Cypher), eliminating sequential network overhead.

---

## 🏗️ Domain-Driven Services

The platform is divided into five functional domains communicating asynchronously via **Kafka**.

### Ingestion Domain ✅ Complete
- **Webhook Service**: Validates HMAC-SHA256 signatures and normalizes GitHub/GitLab events; emits to `pr.events.raw` and `pr.events.merged`.
- **API Gateway**: Secure REST API (NestJS, HS256 JWT, Redis rate limiting, Prisma/PostgreSQL) serving the dashboard and CI integrations.
- **Developer Dashboard**: Full-stack Next.js 14 App Router service. GitHub OAuth via NextAuth v5 mints HS256 JWTs stored in the session cookie and forwarded server-to-server to the api-gateway. Pages: PR review list, inline diff comments, developer/team insights, manual analysis trigger.

### Orchestration Domain
- **Temporal Worker**: Executes durable workflows for PR reviews, managing task fan-out and result aggregation.

### Analysis Domain
- **Static Analysis**: High-speed deterministic scanning using `web-tree-sitter` and Semgrep.
- **Semantic Analysis**: Advanced reasoning layer that retrieves context from the vector store and graph to perform human-like code reviews.
- **Bug Prediction**: Chain-of-thought prompting service dedicated to identifying high-risk logic patterns.

### Intelligence Domain
- **Code Indexer**: Background worker that parses ASTs across 9 languages (TypeScript/TSX, JavaScript/JSX, Python, Java, Go, Rust, C#) using `web-tree-sitter` and precompiled WASM grammars, generates embeddings, deduplicates via Redis hash cache, and synchronizes the Vector DB and Knowledge Graph.
- **Knowledge Graph Service**: Manages the structural integrity and structural queries for the codebase in Neo4j. Supports batched file-path based deletion.
- **LLM Client (Shared)**: Standardized package for all model interactions via Bifrost.

### Output Domain
- **Aggregator**: Consolidates findings from all analyzers and scores the overall PR quality.
- **Notification Service**: Delivers review results back to SCM providers and Slack.
- **Dev Insights**: Analyzes long-term quality trends using TimescaleDB.

---

## 🛠️ The Power Stack

- **Frameworks**: [Nx](https://nx.dev/), [NestJS](https://nestjs.com/), [Next.js 14](https://nextjs.org/)
- **Databases**:
  - **Neo4j** (Graph Representation)
  - **Pinecone** (Vector Search / Embeddings)
  - **PostgreSQL** (Relational Data via Prisma)
  - **Redis** (Hash Cache Deduplication & Query Caching)
- **Infrastructure**:
  - **Kafka** (Asynchronous Messaging)
  - **Temporal** (Durable Workflows)
  - **Bifrost** (LLM Gateway)
  - **AWS S3 / LocalStack** (Gzipped & Encrypted Artifact Storage)

---

## 🚦 Getting Started

### Prerequisites
- Node.js (v20+)
- Docker & Docker Compose
- Nx CLI (`npm install -g nx`)

### Quick Start
1. **Clone the repository** and install dependencies:
   ```bash
   cd ai-code-reviewer
   npm install
   ```
2. **Environment**: Copy each service's `.env.example` to `.env` and fill in the secrets (GitHub OAuth, JWT_SECRET, Kafka brokers, etc.).
3. **Infrastructure**: Spin up all backing services:
   ```bash
   docker compose up kafka redis postgres neo4j -d
   ```
4. **Run a service** (from the `ai-code-reviewer/` directory):
   ```bash
   npx nx run dashboard:serve          # → http://localhost:3004
   npx nx run api-gateway:serve        # → http://localhost:3003
   npx nx run webhook-service:serve    # → http://localhost:3002
   npx nx run knowledge-graph:serve    # → http://localhost:3001
   npx nx run code-indexer:serve       # → http://localhost:3000
   ```

## 📚 Documentation

For deeper technical dives, refer to the [`documentation/`](./documentation/) folder:
- **[Interactive HLD](./documentation/hld_interactive_v4.html)**: Clickable visual guide — select any service to see its responsibilities, tech stack, and Kafka topics.
- **Ingestion domain structures**: [dashboard](./documentation/dashboard-structure.md) · [api-gateway](./documentation/api-gateway-structure.md) · [webhook-service](./documentation/webhook-service-structure.md)
- **Intelligence domain structures**: [code-indexer](./documentation/code-indexer-structure.md) · [knowledge-graph](./documentation/knowledge-graph-structure.md)
- **Shared package structures**: [kafka](./documentation/kafka-structure.md) · [llm-client](./documentation/llm-client-structure.md) · [schemas](./documentation/schemas-structure.md) · [types](./documentation/types-structure.md)

---
*Built for the next generation of code quality.*
