import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Pinecone, Index } from '@pinecone-database/pinecone';

@Injectable()
export class PineconeService implements OnModuleInit {
  private readonly logger = new Logger(PineconeService.name);
  private client!: Pinecone;
  private index!: Index;

  async onModuleInit() {
    try {
      this.client = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY || 'mock-key',
      });
      const indexName = process.env.PINECONE_INDEX || 'ai-code-reviewer';
      
      const response = await this.client.listIndexes();
      const indexExists = response.indexes?.some(idx => idx.name === indexName);
      
      if (!indexExists) {
        this.logger.log(`Creating Pinecone index: ${indexName}...`);
        await this.client.createIndex({
          name: indexName,
          dimension: 1536,
          metric: 'cosine',
          spec: { serverless: { cloud: 'aws', region: 'us-east-1' } },
        });
        
        // Wait for index to be ready
        let isReady = false;
        while (!isReady) {
          const indexDescription = await this.client.describeIndex(indexName);
          if (indexDescription.status?.state === 'Ready') {
            isReady = true;
          } else {
            await new Promise(resolve => setTimeout(resolve, 5000));
            this.logger.log(`Waiting for Pinecone index ${indexName} to be ready...`);
          }
        }
      }

      this.index = this.client.index({ name: indexName });
      this.logger.log(`Connected to Pinecone index: ${indexName}`);
    } catch (error) {
      this.logger.error(`Failed to initialize Pinecone: ${(error as Error).message}`);
      throw error; // Fail-fast for production
    }
  }

  async upsertVectors(repoId: string, vectors: Array<{ id: string; values: number[]; metadata: any }>) {
    try {
      // Use repoId as the namespace to isolate vectors per repository
      const namespace = this.index.namespace(repoId);
      const BATCH_SIZE = 100;
      
      for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
        const batch = vectors.slice(i, i + BATCH_SIZE);
        await namespace.upsert(batch as any);
      }
      this.logger.log(`Upserted total ${vectors.length} vectors to namespace ${repoId} in batches of ${BATCH_SIZE}`);
    } catch (error) {
      this.logger.error(`Failed to upsert vectors to Pinecone: ${(error as Error).message}`);
      throw error;
    }
  }

  async deleteVectors(repoId: string, ids: string[]) {
    try {
      if (ids.length === 0) return;
      const namespace = this.index.namespace(repoId);
      await namespace.deleteMany(ids);
      this.logger.log(`Deleted ${ids.length} vectors from namespace ${repoId}`);
    } catch (error) {
      this.logger.error(`Failed to delete vectors from Pinecone: ${(error as Error).message}`);
      throw error;
    }
  }

  async deleteVectorsByFiles(repoId: string, filePaths: string[]) {
    try {
      if (filePaths.length === 0) return;
      const namespace = this.index.namespace(repoId);
      await namespace.deleteMany({
        filter: {
          file_path: { $in: filePaths }
        }
      });
      this.logger.log(`Deleted vectors for ${filePaths.length} files from namespace ${repoId}`);
    } catch (error) {
      this.logger.error(`Failed to delete vectors by files from Pinecone: ${(error as Error).message}`);
      throw error;
    }
  }
}
