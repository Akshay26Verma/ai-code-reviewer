apps/ingestion/api-gateway/
├── prisma/
│   ├── migrations/
│   │   ├── 20260626113750_init/
│   │   └── 20260627153859_add_user_repo_pull_request/   # UserRepo + PullRequest tables; commitSha on Review
│   └── schema.prisma                     # Review (+ commitSha), Comment, UserRepo, PullRequest models; binaryTargets for linux-musl Docker
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
│   │   ├── user-repos/
│   │   │   ├── user-repos.controller.ts  # GET /user-repos, PUT /user-repos/bulk, POST /user-repos, DELETE /user-repos/:owner/:name (JWT)
│   │   │   ├── user-repos.module.ts
│   │   │   └── user-repos.service.ts     # Lists repos with openPrCount; bulk upsert/add/delete via Prisma
│   │   ├── repos/
│   │   │   ├── repos.controller.ts       # GET /repos/:owner/:repo/prs, PUT …/prs/bulk, GET …/prs/:prNumber/reviews (JWT)
│   │   │   ├── repos.module.ts
│   │   │   └── repos.service.ts          # Upserts PullRequest rows; updates lastPrPollAt on bulk sync
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
│   │   └── app.module.ts                 # Registers KafkaModule, AuthModule, PrismaModule, AnalyzeModule, ReviewsModule, InsightsModule, UserReposModule, ReposModule
│   └── main.ts
├── .env.example
├── Dockerfile                            # builder runs npx prisma generate; runner installs openssl, runs npx prisma migrate deploy before start
├── project.json
├── README.md
├── tsconfig.app.json
├── tsconfig.json
└── webpack.config.js
