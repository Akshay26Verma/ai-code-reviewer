import { Injectable, Logger, BadGatewayException } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class IndexService {
  private readonly logger = new Logger(IndexService.name);
  private readonly codeIndexerUrl =
    process.env.CODE_INDEXER_URL || 'http://localhost:3000';

  async reindex(repoId: string) {
    this.logger.log(`Proxying reindex request for repo ${repoId}`);
    try {
      const { data } = await axios.post(
        `${this.codeIndexerUrl}/indexer/${repoId}/reindex`,
      );
      return data;
    } catch (err) {
      const message = (err as Error).message;
      this.logger.error(`code-indexer reindex failed for ${repoId}: ${message}`);
      throw new BadGatewayException('code-indexer reindex request failed');
    }
  }
}
