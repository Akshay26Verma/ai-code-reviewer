# Shared Kafka Library

A shared library providing Kafka configuration and topic definitions for the AI Code Reviewer platform.

## Features

- **Centralized Topic Registry**: Defines all Kafka topic constants used across the monorepo to ensure consistent topic naming and avoid spelling/routing errors.
- **Event-Driven Communication**: Exposes the standard messaging structure for ingest, index, analysis, and notification pipelines.

## Topic Specifications

The package exports `KafkaTopics`, which maps the following events:

| Enum Name | Topic Name | Description |
|-----------|------------|-------------|
| `PR_EVENTS_RAW` | `pr.events.raw` | Raw webhook payloads received directly from GitHub or GitLab. |
| `PR_EVENTS_MANUAL` | `pr.events.manual` | Manually triggered indexing or analysis event requests. |
| `PR_EVENTS_MERGED` | `pr.events.merged` | Emitted after a PR is verified as merged, triggering the `code-indexer` service. |
| `PR_EVENTS_INDEXED` | `pr.events.indexed` | Emitted by the `code-indexer` service once AST extraction, S3 storage, and db indexing are complete. |
| `ANALYSIS_TASKS_STATIC` | `analysis.tasks.static` | Analysis tasks for static linting or rule checking. |
| `ANALYSIS_TASKS_SEMANTIC` | `analysis.tasks.semantic` | Analysis tasks for deeper LLM semantic understanding of changes. |
| `ANALYSIS_TASKS_PREDICTION` | `analysis.tasks.prediction` | Tasks evaluating bug risk and safety predictions. |
| `ANALYSIS_RESULTS_STATIC` | `analysis.results.static` | Results published by static analysis engine. |
| `ANALYSIS_RESULTS_SEMANTIC` | `analysis.results.semantic` | Results published by semantic analysis engine. |
| `ANALYSIS_RESULTS_PREDICTION`| `analysis.results.prediction`| Results published by prediction analysis engine. |
| `NOTIFICATION_EVENTS` | `notification.events` | System notifications to be sent to external channels (Slack, Email, PR comments). |

## Usage

```typescript
import { KafkaTopics } from '@ai-code-reviewer/kafka';

// Example: Publishing after indexing completes
await producer.send({
  topic: KafkaTopics.PR_EVENTS_INDEXED,
  messages: [{ value: JSON.stringify({ repoId, commitSha }) }]
});
```
