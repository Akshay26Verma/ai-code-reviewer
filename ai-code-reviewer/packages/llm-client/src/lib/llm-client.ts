import axios from 'axios';
import { TaskType } from '@ai-code-reviewer/types';

export interface CompletionRequest {
  task_type: TaskType;
  messages: Array<{ role: string; content: string }>;
  repo_id: string;
}

export interface CompletionResponse {
  content: string;
  model: string;
  provider: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class LLMClient {
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.BIFROST_URL || 'http://localhost:8080';
  }

  /**
   * Sends a completion request to Bifrost with automatic task routing.
   */
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    // In Bifrost, we can call virtual models directly if configured, 
    // or we can pass the task_type as a header for routing.
    // Here we use the Virtual Model approach: "simple", "deep_reasoning", etc.
    
    try {
      const response = await axios.post(`${this.baseUrl}/v1/chat/completions`, {
        model: request.task_type,
        messages: request.messages,
        user: request.repo_id, // Bifrost uses 'user' for cache scoping by default
        metadata: {
          repo_id: request.repo_id,
          task_type: request.task_type
        }
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-repo-id': request.repo_id // Custom header for extra safety/logging in Bifrost
        }
      });

      const choice = response.data.choices[0];
      return {
        content: choice.message.content,
        model: response.data.model,
        provider: response.data.provider || 'unknown',
        usage: response.data.usage
      };
    } catch (error: any) {
      console.error('LLMClient Error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Generates embeddings via Voyage AI (voyage-code-2, 1024 dims).
   */
  async embed(texts: string[]): Promise<number[][]> {
    try {
      const response = await axios.post(
        'https://api.voyageai.com/v1/embeddings',
        { model: 'voyage-code-2', input: texts },
        {
          headers: {
            Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data.data.map((item: any) => item.embedding);
    } catch (error: any) {
      console.error('LLMClient Embedding Error:', error.response?.data || error.message);
      throw error;
    }
  }
}
