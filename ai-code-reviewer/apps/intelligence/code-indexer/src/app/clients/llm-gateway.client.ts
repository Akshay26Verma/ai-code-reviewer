import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class LLMGatewayClient {
  private readonly logger = new Logger(LLMGatewayClient.name);
  private readonly baseUrl = process.env.LLM_GATEWAY_URL || 'http://localhost:8000';

  async embed(texts: string[]): Promise<number[][]> {
    try {
      const response = await axios.post(`${this.baseUrl}/embed`, { texts });
      return response.data.embeddings;
    } catch (error) {
      this.logger.error(`Failed to get embeddings from LLM Gateway: ${(error as Error).message}`);
      throw error;
    }
  }
}
