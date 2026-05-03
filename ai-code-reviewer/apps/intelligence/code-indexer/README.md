# Code Indexer Service

The Code Indexer is a critical background worker in the Intelligence Domain. It is responsible for maintaining the freshness of both the Vector Database (Pinecone) and the Knowledge Graph (Neo4j) after code merges.

## Features

- **Hybrid Architecture**: Runs concurrently as an HTTP server (for manual API requests) and a Kafka consumer.
- **Event-Driven**: Automatically triggers indexing pipelines upon receiving a message on the `pr.events.merged` Kafka topic.
- **AST Parsing**: Uses `web-tree-sitter` (WebAssembly) to perform deep semantic parsing of changed code files to extract entities (functions, classes) and relationships (calls, imports).
- **Vector Upserts**: Integrates with the Python `LLM Gateway` to generate voyage embeddings and stores them in Pinecone (namespaced per repository).
- **Graph Updates**: Translates AST relationships into graph edges and forwards them to the `Knowledge Graph` service to enforce the single-writer pattern.
- **Artifact Archiving**: Stores raw source code snapshots in AWS S3 for historical retrieval during deep-dive analyses.

## Architecture

This service is built using:
- **NestJS**: Framework for the hybrid app setup.
- **KafkaJS**: For consuming event streams from the ingestion layer.
- **web-tree-sitter**: WASM-based multi-language code parser.
- **Pinecone SDK**: For vector database upserts.
- **AWS SDK S3**: For blob storage.
- **Axios**: For cross-domain internal communication with Intelligence services.

## Pipeline Flow (`processMergeEvent`)

When a PR is merged, the indexing pipeline executes the following sequence:
1. **Parse**: Generates AST for all modified files.
2. **Embed**: Calls `POST /embed` on the LLM Gateway for AST nodes.
3. **Upsert**: Stores vectors in Pinecone under the `repo_id` namespace.
4. **Archive**: Pushes raw file snapshots to S3.
5. **Patch**: Calls `POST /graph/patch` on the Knowledge Graph with the updated structural edges.

## API Endpoints

| Method | Endpoint                    | Description                                                            |
|--------|-----------------------------|------------------------------------------------------------------------|
| POST   | `/index/:repoId/reindex`    | Triggers a full, manual re-index for an entire repository (recovery).  |

## Configuration

Required environment variables (`.env`):

- **Kafka**: `KAFKA_BROKERS`, `KAFKA_CLIENT_ID`, `KAFKA_GROUP_ID`
- **Pinecone**: `PINECONE_API_KEY`, `PINECONE_INDEX`
- **AWS S3**: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`
- **Internal APIs**: `LLM_GATEWAY_URL`, `KNOWLEDGE_GRAPH_URL`

## Local Development

```bash
# Run the application
npx nx serve code-indexer

# Build for production
npx nx build code-indexer
```
