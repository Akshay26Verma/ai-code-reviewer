import { Body, Controller, HttpCode, Logger, Post, UseGuards } from '@nestjs/common';
import { GithubSignatureGuard } from './guards/github-signature.guard';
import { GitlabSignatureGuard } from './guards/gitlab-signature.guard';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('github')
  @HttpCode(200)
  @UseGuards(GithubSignatureGuard)
  handleGithub(@Body() body: any) {
    // Respond 200 immediately — GitHub requires acknowledgment within 10s.
    // File fetching and Kafka publishing happen asynchronously.
    this.webhooksService.processGithubEvent(body).catch((err) => {
      this.logger.error(`Async GitHub event processing failed: ${(err as Error).message}`);
    });
    return { received: true };
  }

  @Post('gitlab')
  @HttpCode(200)
  @UseGuards(GitlabSignatureGuard)
  handleGitlab(@Body() body: any) {
    this.webhooksService.processGitlabEvent(body).catch((err) => {
      this.logger.error(`Async GitLab event processing failed: ${(err as Error).message}`);
    });
    return { received: true };
  }
}
