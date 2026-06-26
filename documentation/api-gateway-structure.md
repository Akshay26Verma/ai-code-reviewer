apps/ingestion/api-gateway/
├── prisma/
│   ├── migrations/
│   │   └── ...                           # Prisma migration history
│   └── schema.prisma                     # Review + Comment models
├── src/
│   ├── app/
│   │   ├── analyze/
│   │   │   ├── analyze.controller.ts     # POST /analyze (JWT + rate limit)
│   │   │   ├── analyze.module.ts
│   │   │   └── analyze.service.ts        # Publishes pr.events.manual to Kafka
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── jwt.guard.ts              # HS256 HMAC verification (no third-party JWT lib)
│   │   │   └── rate-limit.guard.ts       # Redis sliding-window rate limiter
│   │   ├── health/
│   │   │   └── health.controller.ts      # GET /health
│   │   ├── index/
│   │   │   ├── index.controller.ts       # POST /index/:repoId/reindex (JWT)
│   │   │   ├── index.module.ts
│   │   │   └── index.service.ts          # Proxies to code-indexer via HTTP
│   │   ├── insights/
│   │   │   ├── insights.controller.ts    # GET /insights/developer/:id, GET /insights/team/:id
│   │   │   ├── insights.module.ts
│   │   │   └── insights.service.ts       # Stub until Aggregator/Dev Insights are built
│   │   ├── kafka/
│   │   │   ├── kafka-producer.service.ts
│   │   │   └── kafka.module.ts
│   │   ├── prisma/
│   │   │   ├── prisma.module.ts
│   │   │   └── prisma.service.ts
│   │   ├── reviews/
│   │   │   ├── reviews.controller.ts     # GET /reviews/:prId (JWT)
│   │   │   ├── reviews.module.ts
│   │   │   └── reviews.service.ts        # Reads from PostgreSQL via Prisma
│   │   ├── shared/
│   │   │   └── zod-validation.pipe.ts    # Global request body validation pipe
│   │   └── app.module.ts
│   └── main.ts
├── .env.example
├── Dockerfile
├── project.json
├── README.md
├── tsconfig.app.json
├── tsconfig.json
└── webpack.config.js
