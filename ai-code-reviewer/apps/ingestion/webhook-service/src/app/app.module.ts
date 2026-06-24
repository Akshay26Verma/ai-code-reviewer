import { Module } from '@nestjs/common';
import { KafkaModule } from './kafka/kafka.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [KafkaModule, WebhooksModule],
  controllers: [HealthController],
})
export class AppModule {}
