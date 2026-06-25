import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Redis } from 'ioredis';
import { Request } from 'express';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly redis: Redis;
  private readonly max: number;
  private readonly windowMs: number;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.max = parseInt(process.env.RATE_LIMIT_MAX || '100', 10);
    this.windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = request.ip || request.socket.remoteAddress || 'unknown';
    const windowKey = Math.floor(Date.now() / this.windowMs);
    const key = `rl:${ip}:${windowKey}`;

    try {
      const count = await this.redis.incr(key);
      if (count === 1) {
        await this.redis.pexpire(key, this.windowMs);
      }
      if (count > this.max) {
        throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
      }
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.error('Rate limit Redis error, allowing request', (err as Error).message);
    }

    return true;
  }
}
