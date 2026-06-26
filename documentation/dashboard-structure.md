apps/ingestion/dashboard/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx              # GitHub OAuth sign-in (Server Component + Server Action)
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx                # Auth gate (redirects to /login), nav sidebar, sign-out
│   │   │   ├── prs/
│   │   │   │   ├── page.tsx              # PR lookup form (Server Component)
│   │   │   │   └── [prId]/
│   │   │   │       └── page.tsx          # PR detail with inline diff comments
│   │   │   └── insights/
│   │   │       └── [type]/
│   │   │           └── [id]/
│   │   │               └── page.tsx      # Developer / team insights
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── [...nextauth]/
│   │   │   │       └── route.ts          # NextAuth handler (GET + POST)
│   │   │   ├── analyze/
│   │   │   │   └── route.ts              # POST → api-gateway /analyze
│   │   │   ├── reviews/
│   │   │   │   └── [prId]/
│   │   │   │       └── route.ts          # GET → api-gateway /reviews/:prId
│   │   │   ├── insights/
│   │   │   │   └── [type]/
│   │   │   │       └── [id]/
│   │   │   │           └── route.ts      # GET → api-gateway /insights/:type/:id
│   │   │   └── index/
│   │   │       └── [repoId]/
│   │   │           └── route.ts          # POST → api-gateway /index/:repoId/reindex
│   │   ├── globals.css
│   │   ├── layout.tsx                    # Root layout (html/body, Tailwind)
│   │   └── page.tsx                      # Redirects to /prs or /login
│   ├── components/
│   │   ├── action-buttons.tsx            # "Request Review" + "Reindex" (Client Component)
│   │   ├── diff-comment.tsx              # Inline comment renderer
│   │   ├── insights-panel.tsx            # Developer / team metrics display
│   │   ├── nav-sidebar.tsx               # Nav links with active state (Client Component)
│   │   ├── pr-detail.tsx                 # PR metadata + comment list
│   │   └── pr-list.tsx                   # PR search results table
│   └── lib/
│       ├── api.ts                        # Server-side api-gateway fetch wrapper (uses auth())
│       ├── auth.ts                       # NextAuth v5 config (GitHub provider + jwt/session callbacks)
│       └── jwt.ts                        # HS256 token minting (mirrors api-gateway JwtGuard)
│   └── types.ts                          # Local types (ReviewComment, Review, AnalyzeRequest)
├── public/
├── .env.example
├── Dockerfile
├── next.config.mjs
├── next.config.ts                        # Unused (Next.js 14 ignores .ts; .mjs takes precedence)
├── postcss.config.js
├── project.json
├── README.md
├── tailwind.config.ts
└── tsconfig.json
