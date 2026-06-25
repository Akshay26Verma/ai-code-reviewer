import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards, UsePipes } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { RateLimitGuard } from '../auth/rate-limit.guard';
import { AnalyzeService } from './analyze.service';
import { ZodValidationPipe } from '../shared/zod-validation.pipe';
import { PREventSchema } from '@ai-code-reviewer/schemas';
import { PREvent } from '@ai-code-reviewer/types';

@Controller('analyze')
@UseGuards(JwtGuard, RateLimitGuard)
export class AnalyzeController {
  constructor(private readonly analyzeService: AnalyzeService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @UsePipes(new ZodValidationPipe(PREventSchema))
  analyze(@Body() event: PREvent) {
    this.analyzeService.triggerReview(event);
    return { queued: true, pr_id: event.pr_id, repo_id: event.repo_id };
  }
}
