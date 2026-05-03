import { Controller, Get } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import { CacheService } from '../cache/cache.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly neo4j: Neo4jService,
    private readonly cache: CacheService,
  ) {}

  @Get()
  async getHealth() {
    const neo4jHealthy = await this.neo4j.isHealthy();
    const redisHealthy = await this.cache.isHealthy();

    return {
      status: neo4jHealthy && redisHealthy ? 'ok' : 'degraded',
      service: 'knowledge-graph',
      dependencies: {
        neo4j: neo4jHealthy ? 'connected' : 'disconnected',
        redis: redisHealthy ? 'connected' : 'disconnected',
      },
    };
  }
}
