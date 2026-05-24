import { Module } from '@nestjs/common';
import { ClientsModule as NestClientsModule, Transport } from '@nestjs/microservices';
import { LLMGatewayClient } from './llm-gateway.client';
import { KnowledgeGraphClient } from './knowledge-graph.client';

@Module({
  imports: [
    NestClientsModule.register([
      {
        name: 'KAFKA_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: process.env.KAFKA_CLIENT_ID || 'code-indexer-client',
            brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
          },
          producerOnlyMode: true,
        },
      },
    ]),
  ],
  providers: [LLMGatewayClient, KnowledgeGraphClient],
  exports: [NestClientsModule, LLMGatewayClient, KnowledgeGraphClient],
})
export class ClientsModule {}
