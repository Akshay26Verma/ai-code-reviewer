import { Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { IndexService } from './index.service';

@Controller('index')
@UseGuards(JwtGuard)
export class IndexController {
  constructor(private readonly indexService: IndexService) {}

  @Post(':repoId/reindex')
  @HttpCode(HttpStatus.ACCEPTED)
  async reindex(@Param('repoId') repoId: string) {
    return this.indexService.reindex(repoId);
  }
}
