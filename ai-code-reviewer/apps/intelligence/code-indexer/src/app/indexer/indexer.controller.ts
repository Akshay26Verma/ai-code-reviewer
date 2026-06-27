import { Controller, Post, Param, Body } from '@nestjs/common';
import { IndexerService } from './indexer.service';

@Controller('index')
export class IndexerController {
  constructor(private readonly indexerService: IndexerService) {}

  @Post(':owner/:repo/reindex')
  async reindexRepo(@Param('owner') owner: string, @Param('repo') repo: string, @Body() body: { files: any[] }) {
    const repoId = `${owner}/${repo}`;
    await this.indexerService.indexRepository(repoId, body.files || []);
    return { status: 'indexing_started', repo_id: repoId };
  }
}
