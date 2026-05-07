# LLM Client

A shared library for interacting with the **Bifrost Gateway**. This package replaces the standalone `llm-gateway` service, consolidating the LLM routing logic into a lightweight client that leverages Bifrost's OpenAI-compatible proxy and virtual modeling capabilities.

## Features

- **Standardized Interface**: Provides a clean `LLMClient` class for completions and embeddings.
- **Bifrost Integration**: Automatically routes requests to the configured Bifrost instance (defaults to `http://localhost:8080`).
- **Task-Based Routing**: Maps `TaskType` (simple, deep_reasoning, etc.) directly to Bifrost Virtual Models for automatic provider fallback and load balancing.
- **Cache Awareness**: Passes `repo_id` as the `user` field and custom headers to ensure correct cache scoping within Bifrost.

## Usage

```typescript
import { LLMClient } from '@ai-code-reviewer/llm-client';
import { TaskType } from '@ai-code-reviewer/types';

const client = new LLMClient();

const response = await client.complete({
  task_type: TaskType.DEEP_REASONING,
  repo_id: 'org/repo',
  messages: [{ role: 'user', content: 'Analyze this diff...' }]
});

console.log(response.content);
```

## Configuration

The client uses the following environment variables:

- `BIFROST_URL`: The URL of your Bifrost instance (default: `http://localhost:8080`).

## Architecture

This package is a pure TypeScript library meant to be consumed by other services (e.g., Code Indexer, Semantic Analyzer) in the monorepo. It handles the mapping from our internal `TaskType` to the external gateway API.
