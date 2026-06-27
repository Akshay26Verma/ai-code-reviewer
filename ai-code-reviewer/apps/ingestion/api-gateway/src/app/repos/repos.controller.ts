import { Body, Controller, Get, Param, Put, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtGuard } from '../auth/jwt.guard';
import { ReposService, UpsertPrDto } from './repos.service';

interface AuthedRequest extends Request {
  user: { sub: string; login: string };
}

@Controller('repos')
@UseGuards(JwtGuard)
export class ReposController {
  constructor(private readonly reposService: ReposService) {}

  @Get(':owner/:repo/prs')
  listPRs(@Param('owner') owner: string, @Param('repo') repo: string) {
    return this.reposService.listPRs(owner, repo);
  }

  @Put(':owner/:repo/prs/bulk')
  bulkUpsertPRs(
    @Req() req: AuthedRequest,
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Body() prs: UpsertPrDto[],
  ) {
    return this.reposService.bulkUpsertPRs(owner, repo, prs, req.user.login);
  }

  @Get(':owner/:repo/prs/:prNumber/reviews')
  listReviews(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Param('prNumber') prNumber: string,
  ) {
    return this.reposService.listReviews(owner, repo, parseInt(prNumber, 10));
  }
}
