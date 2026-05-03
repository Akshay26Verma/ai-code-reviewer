import { Module } from '@nestjs/common';
import { LLMGatewayClient } from './llm-gateway.client';
import { KnowledgeGraphClient } from './knowledge-graph.client';

@Module({
  providers: [LLMGatewayClient, KnowledgeGraphClient],
  exports: [LLMGatewayClient, KnowledgeGraphClient],
})
export class ClientsModule {}
