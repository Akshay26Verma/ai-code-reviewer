import { Module } from '@nestjs/common';
import { KafkaController } from './kafka.controller';
import { IndexerModule } from '../indexer/indexer.module';

@Module({
  imports: [IndexerModule],
  controllers: [KafkaController],
})
export class KafkaModule {}
