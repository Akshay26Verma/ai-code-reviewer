import { Module } from '@nestjs/common';
import { JwtGuard } from './jwt.guard';
import { RateLimitGuard } from './rate-limit.guard';

@Module({
  providers: [JwtGuard, RateLimitGuard],
  exports: [JwtGuard, RateLimitGuard],
})
export class AuthModule {}
