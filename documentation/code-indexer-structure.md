apps/intelligence/code-indexer/
├── src/
│   ├── app/
│   │   ├── clients/
│   │   │   ├── clients.module.ts
│   │   │   ├── knowledge-graph.client.ts
│   │   │   └── llm-gateway.client.ts
│   │   ├── indexer/
│   │   │   ├── indexer.controller.ts     # POST /index/:owner/:repo/reindex — triggers full repository indexing
│   │   │   ├── indexer.module.ts
│   │   │   └── indexer.service.ts
│   │   ├── kafka/
│   │   │   ├── kafka.controller.ts
│   │   │   └── kafka.module.ts
│   │   ├── parser/
│   │   │   ├── languages.config.ts
│   │   │   ├── parser.module.ts
│   │   │   ├── parser.service.ts
│   │   │   └── parser.smoke-test.ts
│   │   ├── storage/
│   │   │   ├── hash-cache.service.ts
│   │   │   ├── pinecone.service.ts
│   │   │   ├── s3.service.ts             # Uploads gzip+AES256 snapshots; logs warning (not throw) if S3 bucket missing at startup
│   │   │   └── storage.module.ts
│   │   └── app.module.ts
│   └── main.ts
├── .env.example
├── project.json
├── README.md
├── tsconfig.app.json
├── tsconfig.json
└── webpack.config.js
