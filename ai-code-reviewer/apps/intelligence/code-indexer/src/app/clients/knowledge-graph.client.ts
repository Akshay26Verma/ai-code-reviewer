import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class KnowledgeGraphClient {
  private readonly logger = new Logger(KnowledgeGraphClient.name);
  private readonly baseUrl = process.env.KNOWLEDGE_GRAPH_URL || 'http://localhost:3001';

  async patchGraph(payload: any): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/graph/patch`, payload);
      this.logger.log(`Successfully patched graph for repo ${payload.repo_id}`);
    } catch (error) {
      this.logger.error(`Failed to patch Knowledge Graph: ${(error as Error).message}`);
      throw error;
    }
  }
}
