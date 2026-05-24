# Code Indexer Service

The Code Indexer is a critical background worker in the Intelligence Domain. It is responsible for maintaining the freshness of both the Vector Database (Pinecone) and the Knowledge Graph (Neo4j) after code merges.

---

## ⚡ Key Features

- **Hybrid Architecture**: Runs concurrently as an HTTP NestJS server (for manual API re-indexing) and a Kafka consumer.
- **Event-Driven**: Automatically triggers indexing pipelines upon receiving a message on the `pr.events.merged` Kafka topic.
- **AST Parsing**: Uses `web-tree-sitter` (WebAssembly) to perform deep semantic parsing of changed code files to extract entities (functions, classes) and relationships (calls, imports).
- **Redis Hash Cache Deduplication**: Uses `HashCacheService` to generate SHA-256 hashes of changed files. If a file's hash matches the cached key in Redis, it skips indexing. Cache is only updated *on successful processing* to avoid incorrect states.
- **Vector Upserts**: Integrates with the shared `@ai-code-reviewer/llm-client` to generate model embeddings and stores them in Pinecone (namespaced per repository). Chunked in batches of 100 to ensure scale safety.
- **S3 Snapshot Archiving**: Compresses raw source code snapshots (`gzipSync`) and uploads them to AWS S3 (or LocalStack in development) with `ServerSideEncryption: 'AES256'` enabled.
- **O(1) Batched Deletion**:
  - **Pinecone**: Employs the `$in` operator inside `deleteVectorsByFiles` to delete all vector embeddings of removed files in a single, high-performance request.
  - **Redis**: Automatically purges hash caches for deleted files.
- **Error Isolation**: Processes each changed file inside its own `try/catch` block so a failure in parsing a single file never halts the remaining indexing pipeline.

---

## 🏗️ Architecture

This service is built using:
- **NestJS**: Core framework.
- **KafkaJS**: For consuming event streams from the ingestion layer and emitting `pr.events.indexed`.
- **web-tree-sitter**: WASM-based code parser.
- **Pinecone SDK**: For vector database operations.
- **AWS SDK S3**: For gzipped/encrypted blob storage.
- **Redis**: For hash-cache deduplication.
- **Axios**: For internal communication with the Knowledge Graph.

---

## 🔄 Indexing Flow (`processMergeEvent`)

When a PR is merged, the indexing pipeline executes:
1. **Validation**: Validates the payload structure.
2. **Segregation**: Splits files into `changedFiles` and `removedFiles`.
3. **Deduplication Check**: Queries Redis to skip unchanged files.
4. **AST Parse & Embed**: Generates code nodes and requests embeddings from the Bifrost LLM Gateway.
5. **Archive**: Compresses and uploads snapshots to S3 (LocalStack in dev).
6. **Batched Deletion**:
   - Deletes Pinecone vectors for removed files using `{ file_path: { $in: paths } }`.
   - Clears hash cache in Redis.
7. **Upsert & Sync**:
   - Upserts vectors to Pinecone.
   - Patches the Neo4j database using `POST /graph/patch` on the Knowledge Graph service (transfers `deleted_file_paths` array).
8. **Finalize**: Updates Redis hash cache for successfully processed files and emits the `pr.events.indexed` Kafka completion event.

---

## 🛠️ API Endpoints

| Method | Endpoint                 | Description                                                           |
|--------|--------------------------|-----------------------------------------------------------------------|
| POST   | `/index/:repoId/reindex` | Triggers a full, manual re-index for an entire repository (recovery). |

---

## ⚙️ Configuration

Required environment variables in `.env`:

* **Bifrost**: `BIFROST_URL` (default: `http://localhost:8080`)
* **Redis**: `REDIS_URL` (default: `redis://localhost:6379/0`)
* **Kafka**: `KAFKA_BROKERS`, `KAFKA_CLIENT_ID`
* **Pinecone**: `PINECONE_API_KEY`, `PINECONE_INDEX`
* **AWS S3**: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`, `S3_ENDPOINT` (optional, for LocalStack dev)
* **Internal APIs**: `KNOWLEDGE_GRAPH_URL`
