import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private client!: Redis;
  private readonly PREFIX = 'kg:cache';
  private readonly TTL = parseInt(process.env.KG_CACHE_TTL || '60', 10); // 60s default per HLD

  async onModuleInit() {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    this.client = new Redis(url);

    this.client.on('connect', () => this.logger.log(`Redis connected at ${url}`));
    this.client.on('error', (err) => this.logger.error(`Redis error: ${err}`));
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Redis disconnected');
    }
  }

  private buildKey(key: string): string {
    return `${this.PREFIX}:${key}`;
  }

  async get<T = any>(key: string): Promise<T | null> {
    try {
      const cached = await this.client.get(this.buildKey(key));
      if (cached) {
        this.logger.debug(`Cache HIT: ${key}`);
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      this.logger.warn(`Cache read error: ${error}`);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      await this.client.set(
        this.buildKey(key),
        JSON.stringify(value),
        'EX',
        ttl ?? this.TTL,
      );
    } catch (error) {
      this.logger.warn(`Cache write error: ${error}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(this.buildKey(key));
    } catch (error) {
      this.logger.warn(`Cache delete error: ${error}`);
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const pong = await this.client.ping();
      return pong === 'PONG';
    } catch {
      return false;
    }
  }
}
