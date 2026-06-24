import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { KafkaTopics } from '@ai-code-reviewer/kafka';
import { PREvent, MergedPREvent } from '@ai-code-reviewer/types';

@Injectable()
export class KafkaProducerService implements OnModuleInit {
  private readonly logger = new Logger(KafkaProducerService.name);

  constructor(@Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka) {}

  async onModuleInit() {
    await this.kafkaClient.connect();
    this.logger.log('Kafka producer connected');
  }

  emitRawEvent(event: PREvent) {
    this.logger.log(`Emitting pr.events.raw for repo ${event.repo_id}, PR #${event.pr_id}`);
    this.kafkaClient.emit(KafkaTopics.PR_EVENTS_RAW, event);
  }

  emitMergedEvent(event: MergedPREvent) {
    this.logger.log(`Emitting pr.events.merged for repo ${event.repo_id}, PR #${event.pr_id}`);
    this.kafkaClient.emit(KafkaTopics.PR_EVENTS_MERGED, event);
  }
}
