import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Create hybrid application (HTTP + Kafka)
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: process.env.KAFKA_CLIENT_ID || 'code-indexer-client',
        brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      },
      consumer: {
        groupId: process.env.KAFKA_GROUP_ID || 'code-indexer-group',
      },
    },
  });

  const port = process.env.PORT || 3000;
  
  await app.startAllMicroservices();
  await app.listen(port);
  
  logger.log(`🚀 Code Indexer HTTP running on: http://localhost:${port}`);
  logger.log(`🚀 Code Indexer Kafka consumer connected`);
}

bootstrap();
