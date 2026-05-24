import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { S3Client, PutObjectCommand, HeadBucketCommand, CreateBucketCommand } from '@aws-sdk/client-s3';
import { gzipSync } from 'zlib';

@Injectable()
export class S3Service implements OnModuleInit {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucketName = process.env.S3_BUCKET_NAME || 'ai-code-reviewer-artifacts';

  constructor() {
    const s3Endpoint = process.env.S3_ENDPOINT;
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'mock',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'mock',
      },
      ...(s3Endpoint && {
        endpoint: s3Endpoint,
        forcePathStyle: true,
      }),
    });
  }

  async onModuleInit() {
    try {
      this.logger.log(`Verifying S3 bucket: ${this.bucketName}...`);
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
      this.logger.log(`Successfully verified S3 bucket: ${this.bucketName}`);
    } catch (error) {
      const isDev = process.env.S3_ENDPOINT || process.env.NODE_ENV !== 'production';
      if (isDev) {
        this.logger.warn(`S3 bucket "${this.bucketName}" not found or inaccessible. Attempting to create it in development mode...`);
        try {
          await this.s3Client.send(new CreateBucketCommand({ Bucket: this.bucketName }));
          this.logger.log(`Successfully created S3 bucket: ${this.bucketName}`);
        } catch (createError) {
          this.logger.error(`Failed to auto-create S3 bucket in development: ${(createError as Error).message}`);
          throw createError;
        }
      } else {
        this.logger.error(`S3 bucket "${this.bucketName}" does not exist or is inaccessible: ${(error as Error).message}`);
        throw error;
      }
    }
  }

  async uploadSnapshot(repoId: string, commitSha: string, fileKey: string, content: string) {
    const key = `${repoId}/snapshots/${commitSha}/${fileKey}`;
    try {
      // Compress content using gzip
      const compressedBody = gzipSync(Buffer.from(content, 'utf-8'));
      
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: compressedBody,
          ContentType: 'text/plain',
          ContentEncoding: 'gzip',
          ServerSideEncryption: 'AES256',
        }),
      );
      this.logger.log(`Uploaded compressed snapshot to S3: ${key}`);
      return `s3://${this.bucketName}/${key}`;
    } catch (error) {
      this.logger.error(`Failed to upload to S3: ${(error as Error).message}`);
      throw error;
    }
  }
}
