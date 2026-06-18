import { Module } from '@nestjs/common';
import { KafkaModule } from './kafka/kafka.module';
import { IndexerModule } from './indexer/indexer.module';

@Module({
  imports: [KafkaModule, IndexerModule],
})
export class AppModule {}
