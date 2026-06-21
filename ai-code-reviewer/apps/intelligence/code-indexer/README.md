# Code Indexer Service

The Code Indexer is a critical background worker in the Intelligence Domain. It is responsible for maintaining the freshness of both the Vector Database (Pinecone) and the Knowledge Graph (Neo4j) after code merges.

---

## ⚡ Key Features

- **Hybrid Architecture**: Runs concurrently as an HTTP NestJS server (for manual API re-indexing) and a Kafka consumer.
- **Event-Driven**: Automatically triggers indexing pipelines upon receiving a message on the `pr.events.merged` Kafka topic.
- **Multi-Language AST Parsing**: Uses `web-tree-sitter` (WebAssembly) with precompiled grammars from `tree-sitter-wasms` to perform deep semantic parsing of changed code files. Supports **TypeScript, TSX, JavaScript, JSX, Python, Java, Go, Rust, and C#**. Extracts entities (`FILE`, `CLASS`, `FUNCTION` nodes) and relationships (`CALLS`, `IMPORTS`, `EXTENDS`/`IMPLEMENTS` edges) via a single-pass DFS walker with scope-stack tracking. Language configurations are fully declarative in `languages.config.ts`.
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
- **web-tree-sitter + tree-sitter-wasms**: WASM-based code parser with precompiled grammars for 9 languages.
- **Pinecone SDK**: For vector database operations.
- **AWS SDK S3**: For gzipped/encrypted blob storage.
- **Redis**: For hash-cache deduplication.
- **Axios**: For internal communication with the Knowledge Graph.

---

## 🔄 Indexing Flow (`processMergeEvent`)

When a PR is merged, the indexing pipeline executes:
1. **Validation**: Validates the payload structure.
2. **Segregation**: Splits files into `changedFiles` and `removedFiles`. Files matching excluded path patterns (`node_modules/`, `vendor/`, `bower_components/`, `dist/`, `build/`, `.git/`) are silently skipped in both passes.
3. **Deduplication Check**: Queries Redis to skip unchanged files.
4. **AST Parse & Embed**: Loads the language-specific WASM grammar, parses the source into an AST, and walks the tree with a DFS scope-stack walker to extract `ParsedNode[]` (FILE, CLASS, FUNCTION — with full source content, line ranges, and hierarchical IDs like `file.ts#ClassName.methodName`) and `ParsedEdge[]` (CALLS, IMPORTS, EXTENDS, IMPLEMENTS). Then requests embeddings from the Bifrost LLM Gateway.
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

---

## 🧩 Parser Architecture

### Supported Languages

| Extension | Language | WASM Grammar |
|-----------|----------|--------------|
| `.ts` | TypeScript | `tree-sitter-typescript.wasm` |
| `.tsx` | TSX | `tree-sitter-tsx.wasm` |
| `.js` | JavaScript | `tree-sitter-javascript.wasm` |
| `.jsx` | JSX | `tree-sitter-javascript.wasm` |
| `.py` | Python | `tree-sitter-python.wasm` |
| `.java` | Java | `tree-sitter-java.wasm` |
| `.go` | Go | `tree-sitter-go.wasm` |
| `.rs` | Rust | `tree-sitter-rust.wasm` |
| `.cs` | C# | `tree-sitter-c_sharp.wasm` |

### Node & Edge Model

**Nodes** (`ParsedNode`):
- `FILE` — Root node representing the entire file (full source content).
- `CLASS` — Class, struct, interface, trait, or enum declarations.
- `FUNCTION` — Functions, methods, constructors, and arrow functions.

Each node has a deterministic, scope-nested ID: `filePath#ClassName.methodName`.

**Edges** (`ParsedEdge`):
- `IMPORTS` — File → imported module path.
- `CALLS` — Enclosing function/class → callee name.
- `EXTENDS` / `IMPLEMENTS` — Class → base class or interface.

### Adding a New Language

1. Ensure the `.wasm` grammar file exists in `node_modules/tree-sitter-wasms/out/`.
2. Add an entry to `LANGUAGE_CONFIGS` in `languages.config.ts` with the correct AST node types.
3. Optionally add `extractImport`, `extractInheritance`, `extractName`, or `extractCallee` overrides for non-standard grammars.
4. Run the smoke test to verify (see below).

### Smoke Test

```bash
npx nx run code-indexer:smoke-test
```

---

## ⚠️ Known Limitations

- **Dangling CALLS Edges**: Since `web-tree-sitter` performs syntactic (not semantic) parsing, calls to built-in/stdlib methods (e.g., `Array.push`, `Map.get`) are emitted as `CALLS` edges whose targets have no corresponding node in the knowledge graph. These create harmless dangling edges but add noise. Accurate resolution requires language-specific compiler/type-checker APIs (planned for TypeScript via the TS Compiler API).

- **Typed Call Resolution is TS/JS Only**: Receiver-type inference — resolving `this.service.method()` to `ServiceClass.method` — relies on a scope tracker that captures TypeScript and JavaScript class fields (`property_definition`, `public_field_definition`, `field_definition`) and typed constructor parameters. For all other languages (Python, Java, Go, Rust, C#), `CALLS` edges always point to the raw callee name without receiver-type resolution. Full cross-language resolution requires compiler/type-checker API integration and is accepted as out of scope for this phase.
