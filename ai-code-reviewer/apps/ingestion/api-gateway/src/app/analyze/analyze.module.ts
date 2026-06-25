import { Module } from '@nestjs/common';
import { AnalyzeController } from './analyze.controller';
import { AnalyzeService } from './analyze.service';
import { KafkaModule } from '../kafka/kafka.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [KafkaModule, AuthModule],
  controllers: [AnalyzeController],
  providers: [AnalyzeService],
})
export class AnalyzeModule {}
