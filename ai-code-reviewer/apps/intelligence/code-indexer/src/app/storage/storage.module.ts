import { Module } from '@nestjs/common';
import { PineconeService } from './pinecone.service';
import { S3Service } from './s3.service';

import { HashCacheService } from './hash-cache.service';

@Module({
  providers: [PineconeService, S3Service, HashCacheService],
  exports: [PineconeService, S3Service, HashCacheService],
})
export class StorageModule {}
