import { Injectable, Logger } from '@nestjs/common';
import { LLMClient } from '@ai-code-reviewer/llm-client';

@Injectable()
export class LLMGatewayClient {
  private readonly logger = new Logger(LLMGatewayClient.name);
  private readonly client = new LLMClient();

  async embed(texts: string[]): Promise<number[][]> {
    try {
      return await this.client.embed(texts);
    } catch (error) {
      this.logger.error(`Failed to get embeddings from Voyage AI: ${(error as Error).message}`);
      throw error;
    }
  }
}
