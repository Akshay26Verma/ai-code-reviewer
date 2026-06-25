import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { KafkaTopics } from '@ai-code-reviewer/kafka';
import { PREvent } from '@ai-code-reviewer/types';

@Injectable()
export class KafkaProducerService implements OnModuleInit {
  private readonly logger = new Logger(KafkaProducerService.name);

  constructor(@Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka) {}

  async onModuleInit() {
    await this.kafkaClient.connect();
    this.logger.log('Kafka producer connected');
  }

  emitManualEvent(event: PREvent) {
    this.logger.log(`Emitting pr.events.manual for repo ${event.repo_id}, PR #${event.pr_id}`);
    this.kafkaClient.emit(KafkaTopics.PR_EVENTS_MANUAL, event);
  }
}
