# Shared Schemas Library

A shared library providing Zod schemas for runtime schema validation across the AI Code Reviewer microservices.

## Features

- **Runtime Validation**: Ensures type-safety at the microservice boundaries (Kafka message payloads, HTTP request/response validation).
- **Zod-to-TypeScript Sync**: Integrates directly with the `@ai-code-reviewer/types` package to enforce that runtime validators match their TypeScript design definitions.

## Exported Schemas

The package organizes and exports schemas across several logical domains:

### 1. Events (`/src/events.ts`)
* `PREventSchema`: Validates pull request status and lifecycle events (`opened`, `updated`, `closed`, `merged`).
* `PRFileChangeSchema`: Validates a single changed file entry (filename, content, status).
* `MergedPREventSchema`: Validates the full merged PR Kafka payload including the `files` array.

### 2. Analysis (`/src/analysis.ts`)
* `FindingSchema`: Validates static analysis linter/rule issues (e.g. Semgrep, CodeQL).
* `SemanticCommentSchema`: Validates AI/LLM-generated code quality and architectural comments.
* `BugPredictionSchema`: Validates bug likelihood categories (e.g. null pointer, memory leak, race conditions) and reasoning.

### 3. Review (`/src/review.ts`)
* `CommentSchema`: General comments attached to specific code lines.
* `ScoreSchema`: Aggregate PR score calculations.
* `ReviewSchema`: Complete structural representation of a generated PR review.

### 4. Insights (`/src/insights.ts`)
* `DeveloperInsightSchema`: Tracks historical developer metrics (e.g. regression rate, null-check miss rate).
* `TeamSummarySchema`: Summarizes aggregate metrics and risk levels for teams.

## Usage

```typescript
import { ReviewSchema } from '@ai-code-reviewer/schemas';

const result = ReviewSchema.safeParse(req.body);
if (!result.success) {
  throw new Error(`Invalid review schema: ${result.error.message}`);
}
const review = result.data; // Fully typed
```
