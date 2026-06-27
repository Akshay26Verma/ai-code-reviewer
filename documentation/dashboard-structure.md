apps/ingestion/dashboard/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx              # Multi-account quick login: reads known_gh_accounts cookie, shows avatars; falls back to GitHub OAuth with account hint
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx                # Auth gate (redirects to /login), nav sidebar, AccountTracker for known-accounts cookie, server-action sign-out
│   │   │   ├── prs/
│   │   │   │   └── page.tsx              # Repo selector (RepoSearchTable) — pick a repo to navigate to its PRs
│   │   │   ├── home/
│   │   │   │   └── page.tsx              # Repo grid with SyncReposButton and AddRepoDialog (Server Component)
│   │   │   ├── repos/
│   │   │   │   └── [owner]/
│   │   │   │       └── [repo]/
│   │   │   │           └── prs/
│   │   │   │               ├── page.tsx          # PRTable, RefreshPRsButton, IndexRepoButton per repo
│   │   │   │               └── [prNumber]/
│   │   │   │                   └── page.tsx      # PR detail: diff comments, RequestReviewButton
│   │   │   └── insights/
│   │   │       ├── developer/
│   │   │       │   └── page.tsx          # Developer insights landing (login lookup → /insights/developer/:id)
│   │   │       └── team/
│   │   │           └── page.tsx          # Team insights landing (team ID lookup → /insights/team/:id)
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── [...nextauth]/
│   │   │   │       └── route.ts          # NextAuth handler (GET + POST)
│   │   │   ├── analyze/
│   │   │   │   └── route.ts              # POST → api-gateway /analyze
│   │   │   ├── reviews/
│   │   │   │   └── [prId]/
│   │   │   │       └── route.ts          # GET → api-gateway /reviews/:prId
│   │   │   └── insights/
│   │   │       └── [type]/
│   │   │           └── [id]/
│   │   │               └── route.ts      # GET → api-gateway /insights/:type/:id
│   │   ├── globals.css
│   │   ├── layout.tsx                    # Root layout (html/body, Tailwind)
│   │   └── page.tsx                      # Redirects to /home or /login
│   ├── components/
│   │   ├── account-tracker.tsx           # Sets known_gh_accounts cookie for multi-account login (Client Component)
│   │   ├── action-buttons.tsx            # "Request Review" + "Reindex" (Client Component)
│   │   ├── add-repo-dialog.tsx           # Modal to add a custom owner/repo (Client Component)
│   │   ├── delete-repo-button.tsx        # Calls deleteRepo server action (Client Component)
│   │   ├── diff-comment.tsx              # Inline comment renderer
│   │   ├── index-repo-button.tsx         # Triggers code-indexer reindex (Client Component)
│   │   ├── insights-panel.tsx            # Developer / team metrics display
│   │   ├── nav-sidebar.tsx               # Nav links (/home, /prs, /insights) with active state (Client Component)
│   │   ├── pagination.tsx                # Reusable page-number control (Client Component)
│   │   ├── pr-detail.tsx                 # PR metadata + comment list
│   │   ├── pr-list.tsx                   # PR search results table
│   │   ├── pr-table.tsx                  # Paginated PR rows with RequestReviewButton (Client Component)
│   │   ├── refresh-prs-button.tsx        # Calls syncPRs/runDeltaSyncPRs based on lastPrPollAt (Client Component)
│   │   ├── repo-grid.tsx                 # Card grid of UserRepo entries (Client Component)
│   │   ├── repo-search-table.tsx         # Searchable repo table for PR navigation (Client Component)
│   │   ├── request-review-button.tsx     # Calls requestReview server action (Client Component)
│   │   └── sync-repos-button.tsx         # Calls syncRepos server action (Client Component)
│   └── lib/
│       ├── actions.ts                    # Server actions: signOutAction (revokes GitHub token), syncRepos, syncPRs, runDeltaSyncPRs, addCustomRepo, deleteRepo, requestReview
│       ├── api.ts                        # Server-side api-gateway fetch wrapper; user-repos (list/bulk upsert/add/delete) and repos/PR endpoints
│       ├── auth.ts                       # NextAuth v5 config; adds repo OAuth scope; persists githubToken in JWT and session
│       ├── github.ts                     # GitHub API utils: getUserRepos, getOpenPRs, checkRepoAccess, getPRFiles, deltaSyncPRs, getPR
│       └── jwt.ts                        # HS256 token minting (mirrors api-gateway JwtGuard)
│   └── types.ts                          # Types: ReviewComment, Review, AnalyzeRequest, UserRepo, GithubRepo, GithubPR, PullRequest
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
