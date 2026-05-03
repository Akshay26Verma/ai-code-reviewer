import { Controller, Post, Param, Body } from '@nestjs/common';
import { IndexerService } from './indexer.service';

@Controller('index')
export class IndexerController {
  constructor(private readonly indexerService: IndexerService) {}

  @Post(':repoId/reindex')
  async reindexRepo(@Param('repoId') repoId: string, @Body() body: { files: any[] }) {
    await this.indexerService.indexRepository(repoId, body.files || []);
    return { status: 'indexing_started', repo_id: repoId };
  }
}
