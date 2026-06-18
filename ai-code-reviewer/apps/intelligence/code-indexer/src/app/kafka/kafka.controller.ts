import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { KafkaTopics } from '@ai-code-reviewer/kafka';
import { MergedPREvent } from '@ai-code-reviewer/types';
import { IndexerService } from '../indexer/indexer.service';

@Controller()
export class KafkaController {
  private readonly logger = new Logger(KafkaController.name);

  constructor(private readonly indexerService: IndexerService) {}

  @EventPattern(KafkaTopics.PR_EVENTS_MERGED)
  async handleMergedEvent(@Payload() message: MergedPREvent) {
    this.logger.log(`Received pr.events.merged event`);
    try {
      await this.indexerService.processMergeEvent(message);
    } catch (error) {
      this.logger.error(`Error processing merge event: ${(error as Error).message}`);
    }
  }
}
