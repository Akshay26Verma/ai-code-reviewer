import { Injectable, Logger } from '@nestjs/common';
import { KafkaProducerService } from '../kafka/kafka-producer.service';
import { PREvent } from '@ai-code-reviewer/types';

@Injectable()
export class AnalyzeService {
  private readonly logger = new Logger(AnalyzeService.name);

  constructor(private readonly kafka: KafkaProducerService) {}

  triggerReview(event: PREvent) {
    this.logger.log(`Triggering manual review for repo ${event.repo_id}, PR #${event.pr_id}`);
    this.kafka.emitManualEvent(event);
  }
}
