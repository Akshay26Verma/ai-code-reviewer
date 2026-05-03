import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { IndexerService } from '../indexer/indexer.service';

@Controller()
export class KafkaController {
  private readonly logger = new Logger(KafkaController.name);

  constructor(private readonly indexerService: IndexerService) {}

  @EventPattern('pr.events.merged')
  async handleMergedEvent(@Payload() message: any) {
    this.logger.log(`Received pr.events.merged event`);
    try {
      await this.indexerService.processMergeEvent(message);
    } catch (error) {
      this.logger.error(`Error processing merge event: ${(error as Error).message}`);
    }
  }
}
