import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class HashCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HashCacheService.name);
  private redisClient!: Redis;

  async onModuleInit() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379/0';
    this.redisClient = new Redis(redisUrl);
    
    this.redisClient.on('connect', () => {
      this.logger.log(`Connected to Redis for hash caching at ${redisUrl}`);
    });

    this.redisClient.on('error', (error) => {
      this.logger.error(`Redis connection error: ${error.message}`);
    });
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }

  /**
   * Checks if the given hash matches the cached hash for the file.
   * @param repoId The repository ID
   * @param filePath The path of the file
   * @param currentHash The newly computed hash of the file content
   * @returns true if hashes match (duplicate), false otherwise
   */
  async isDuplicate(repoId: string, filePath: string, currentHash: string): Promise<boolean> {
    try {
      const key = `hash:${repoId}:${filePath}`;
      const cachedHash = await this.redisClient.get(key);
      return cachedHash === currentHash;
    } catch (error) {
      this.logger.warn(`Failed to check cache for ${filePath}: ${(error as Error).message}`);
      // Fail open: if cache fails, treat as not duplicate so we process the file
      return false;
    }
  }

  /**
   * Updates the cached hash for a file.
   */
  async updateHash(repoId: string, filePath: string, newHash: string): Promise<void> {
    try {
      const key = `hash:${repoId}:${filePath}`;
      // Set hash with a 30-day TTL (adjust as needed)
      await this.redisClient.set(key, newHash, 'EX', 30 * 24 * 60 * 60);
    } catch (error) {
      this.logger.warn(`Failed to update cache for ${filePath}: ${(error as Error).message}`);
    }
  }

  /**
   * Clears the cached hash for a file.
   */
  async clearCache(repoId: string, filePath: string): Promise<void> {
    try {
      const key = `hash:${repoId}:${filePath}`;
      await this.redisClient.del(key);
      this.logger.log(`Cleared hash cache for file ${filePath} in repo ${repoId}`);
    } catch (error) {
      this.logger.warn(`Failed to clear cache for ${filePath}: ${(error as Error).message}`);
    }
  }
}
