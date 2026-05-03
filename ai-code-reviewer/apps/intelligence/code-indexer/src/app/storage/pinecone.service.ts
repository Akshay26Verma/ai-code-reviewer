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
      this.index = this.client.index(indexName);
      this.logger.log(`Connected to Pinecone index: ${indexName}`);
    } catch (error) {
      this.logger.error(`Failed to initialize Pinecone: ${(error as Error).message}`);
    }
  }

  async upsertVectors(repoId: string, vectors: Array<{ id: string; values: number[]; metadata: any }>) {
    try {
      // Use repoId as the namespace to isolate vectors per repository
      const namespace = this.index.namespace(repoId);
      await namespace.upsert(vectors as any);
      this.logger.log(`Upserted ${vectors.length} vectors to namespace ${repoId}`);
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
}
