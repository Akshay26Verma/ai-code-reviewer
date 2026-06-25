import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 3003;
  await app.listen(port);
  logger.log(`API Gateway running on: http://localhost:${port}`);
}
bootstrap();
