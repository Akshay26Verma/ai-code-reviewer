import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { GithubNormalizer } from './normalizers/github.normalizer';
import { GitlabNormalizer } from './normalizers/gitlab.normalizer';
import { GithubAppService } from './scm-clients/github-app.service';
import { GithubApiClient } from './scm-clients/github-api.client';
import { GitlabApiClient } from './scm-clients/gitlab-api.client';
import { GithubSignatureGuard } from './guards/github-signature.guard';
import { GitlabSignatureGuard } from './guards/gitlab-signature.guard';
import { KafkaModule } from '../kafka/kafka.module';

@Module({
  imports: [KafkaModule],
  controllers: [WebhooksController],
  providers: [
    WebhooksService,
    GithubNormalizer,
    GitlabNormalizer,
    GithubAppService,
    GithubApiClient,
    GitlabApiClient,
    GithubSignatureGuard,
    GitlabSignatureGuard,
  ],
})
export class WebhooksModule {}
