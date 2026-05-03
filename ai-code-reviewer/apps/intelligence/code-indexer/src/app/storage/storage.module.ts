import { Module } from '@nestjs/common';
import { PineconeService } from './pinecone.service';
import { S3Service } from './s3.service';

@Module({
  providers: [PineconeService, S3Service],
  exports: [PineconeService, S3Service],
})
export class StorageModule {}
