import { Module } from '@nestjs/common';
import { Neo4jModule } from './neo4j/neo4j.module';
import { CacheModule } from './cache/cache.module';
import { GraphModule } from './graph/graph.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [Neo4jModule, CacheModule, GraphModule],
  controllers: [HealthController],
})
export class AppModule {}
