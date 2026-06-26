apps/ingestion/webhook-service/
├── src/
│   ├── app/
│   │   ├── health/
│   │   │   └── health.controller.ts              # GET /health
│   │   ├── kafka/
│   │   │   ├── kafka-producer.service.ts          # Publishes pr.events.raw / pr.events.merged
│   │   │   └── kafka.module.ts
│   │   ├── webhooks/
│   │   │   ├── guards/
│   │   │   │   ├── github-signature.guard.ts     # HMAC-SHA256 + timingSafeEqual
│   │   │   │   └── gitlab-signature.guard.ts     # X-Gitlab-Token header check
│   │   │   ├── normalizers/
│   │   │   │   ├── github.normalizer.ts          # Raw GitHub payload → PREvent / MergedPREvent
│   │   │   │   ├── gitlab.normalizer.ts          # Raw GitLab payload → PREvent / MergedPREvent
│   │   │   │   └── normalizer.interface.ts       # INormalizer contract
│   │   │   ├── scm-clients/
│   │   │   │   ├── github-api.client.ts          # Fetches changed file content via REST API
│   │   │   │   ├── github-app.service.ts         # RS256 JWT → installation token (in-process cache)
│   │   │   │   └── gitlab-api.client.ts          # Fetches MR diff + file content
│   │   │   ├── webhooks.controller.ts            # POST /webhooks/github, POST /webhooks/gitlab
│   │   │   ├── webhooks.module.ts
│   │   │   └── webhooks.service.ts               # Orchestrates validate → normalize → fetch → emit
│   │   └── app.module.ts
│   └── main.ts
├── .env.example
├── Dockerfile
├── project.json
├── README.md
├── tsconfig.app.json
├── tsconfig.json
└── webhook.config.js
