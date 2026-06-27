import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtGuard } from '../auth/jwt.guard';
import { UpsertRepoDto, UserReposService } from './user-repos.service';

interface AuthedRequest extends Request {
  user: { sub: string; login: string };
}

@Controller('user-repos')
@UseGuards(JwtGuard)
export class UserReposController {
  constructor(private readonly userReposService: UserReposService) {}

  @Get()
  list(@Req() req: AuthedRequest) {
    return this.userReposService.list(req.user.login);
  }

  @Put('bulk')
  bulkUpsert(@Req() req: AuthedRequest, @Body() repos: UpsertRepoDto[]) {
    return this.userReposService.bulkUpsert(req.user.login, repos);
  }

  @Post()
  addCustom(@Req() req: AuthedRequest, @Body() repo: UpsertRepoDto) {
    return this.userReposService.addCustom(req.user.login, repo);
  }

  @Delete(':owner/:name')
  remove(
    @Req() req: AuthedRequest,
    @Param('owner') owner: string,
    @Param('name') name: string,
  ) {
    return this.userReposService.remove(req.user.login, owner, name);
  }
}
