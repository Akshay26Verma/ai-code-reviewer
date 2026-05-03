import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucketName = process.env.S3_BUCKET_NAME || 'ai-code-reviewer-artifacts';

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'mock',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'mock',
      },
    });
  }

  async uploadSnapshot(repoId: string, commitSha: string, fileKey: string, content: string) {
    const key = `${repoId}/snapshots/${commitSha}/${fileKey}`;
    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: content,
          ContentType: 'text/plain',
        }),
      );
      this.logger.log(`Uploaded snapshot to S3: ${key}`);
      return `s3://${this.bucketName}/${key}`;
    } catch (error) {
      this.logger.error(`Failed to upload to S3: ${(error as Error).message}`);
      throw error;
    }
  }
}
