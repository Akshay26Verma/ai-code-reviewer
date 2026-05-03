import { Module } from '@nestjs/common';
import { IndexerService } from './indexer.service';
import { ParserModule } from '../parser/parser.module';
import { ClientsModule } from '../clients/clients.module';
import { StorageModule } from '../storage/storage.module';
import { IndexerController } from './indexer.controller';

@Module({
  imports: [ParserModule, ClientsModule, StorageModule],
  providers: [IndexerService],
  controllers: [IndexerController],
  exports: [IndexerService],
})
export class IndexerModule {}
