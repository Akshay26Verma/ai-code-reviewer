import { Module } from '@nestjs/common';
import { KafkaModule } from './kafka/kafka.module';
import { IndexerModule } from './indexer/indexer.module';
import { ParserModule } from './parser/parser.module';
import { ClientsModule } from './clients/clients.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [KafkaModule, IndexerModule, ParserModule, ClientsModule, StorageModule],
})
export class AppModule {}
