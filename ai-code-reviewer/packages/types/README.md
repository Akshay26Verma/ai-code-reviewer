# Shared Types Library

A shared library providing static TypeScript interfaces and types for the AI Code Reviewer platform.

## Features

- **Compile-Time Safety**: Standardizes domain contracts and models so that compiler errors occur when boundaries drift.
- **Monorepo-Wide Alignment**: Reused by ingest backend, processing workers, database clients, and evaluation dashboards.

## Exported Typings

### 1. Core Task Routing (`/src/index.ts`)
* `TaskType`: Maps specific LLM operations to target requirements:
  - `SIMPLE`: Fast, low-latency completions.
  - `DEEP_REASONING`: Slower, chain-of-thought analysis.
  - `PRODUCTION`: Balanced throughput/reasoning for normal workflows.

### 2. Events (`/src/events.ts`)
* `PREvent`: Structure for PR webhooks containing commits, actions, and repo context.

### 3. Analysis (`/src/analysis.ts`)
* `Finding`: Issue reported by static lint rules.
* `SemanticComment`: AI architectural review notes.
* `BugPrediction`: Automated logic flaw predictions.

### 4. Review (`/src/review.ts`)
* `Comment`: Code-line annotation.
* `Score`: Quality score metric.
* `Review`: Full PR review report.

### 5. Insights (`/src/insights.ts`)
* `DeveloperInsight`: Aggregated individual developer statistics.
* `TeamSummary`: Aggregated dashboard metrics for team management.
