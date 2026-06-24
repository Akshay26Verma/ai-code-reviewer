import { Injectable, Logger } from '@nestjs/common';
import { MergedPREvent, PREvent } from '@ai-code-reviewer/types';
import { KafkaProducerService } from '../kafka/kafka-producer.service';
import { GithubNormalizer } from './normalizers/github.normalizer';
import { GitlabNormalizer } from './normalizers/gitlab.normalizer';
import { GithubApiClient } from './scm-clients/github-api.client';
import { GitlabApiClient } from './scm-clients/gitlab-api.client';
import { GithubMeta, GitlabMeta } from './normalizers/normalizer.interface';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly kafka: KafkaProducerService,
    private readonly githubNormalizer: GithubNormalizer,
    private readonly gitlabNormalizer: GitlabNormalizer,
    private readonly githubApi: GithubApiClient,
    private readonly gitlabApi: GitlabApiClient,
  ) {}

  /**
   * Called asynchronously after the controller has already responded 200.
   * Fetches file content from the SCM API and publishes the appropriate Kafka event.
   */
  async processGithubEvent(payload: any): Promise<void> {
    let normalized;
    try {
      normalized = this.githubNormalizer.normalize(payload);
    } catch (err) {
      this.logger.error(`Failed to normalize GitHub payload: ${(err as Error).message}`);
      return;
    }

    if (!normalized.isMerge) {
      this.kafka.emitRawEvent(normalized.event);
      return;
    }

    try {
      const meta = normalized.scmMeta as GithubMeta;
      const files = await this.githubApi.getPRFiles(
        meta.owner,
        meta.repo,
        meta.prNumber,
        meta.installationId,
      );

      const mergedEvent: MergedPREvent = {
        ...(normalized.event as PREvent),
        action: 'merged',
        files,
      };

      this.kafka.emitMergedEvent(mergedEvent);
    } catch (err) {
      this.logger.error(
        `Failed to fetch GitHub PR files or publish merged event: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }

  async processGitlabEvent(payload: any): Promise<void> {
    let normalized;
    try {
      normalized = this.gitlabNormalizer.normalize(payload);
    } catch (err) {
      this.logger.error(`Failed to normalize GitLab payload: ${(err as Error).message}`);
      return;
    }

    if (!normalized.isMerge) {
      this.kafka.emitRawEvent(normalized.event);
      return;
    }

    try {
      const meta = normalized.scmMeta as GitlabMeta;
      const files = await this.gitlabApi.getMRFiles(meta.projectId, meta.mrIid, meta.commitSha);

      const mergedEvent: MergedPREvent = {
        ...(normalized.event as PREvent),
        action: 'merged',
        files,
      };

      this.kafka.emitMergedEvent(mergedEvent);
    } catch (err) {
      this.logger.error(
        `Failed to fetch GitLab MR files or publish merged event: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }
}
