import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { KafkaModule } from './kafka/kafka.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { AnalyzeModule } from './analyze/analyze.module';
import { ReviewsModule } from './reviews/reviews.module';
import { InsightsModule } from './insights/insights.module';
import { IndexModule } from './index/index.module';

@Module({
  imports: [
    KafkaModule,
    AuthModule,
    PrismaModule,
    AnalyzeModule,
    ReviewsModule,
    InsightsModule,
    IndexModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
