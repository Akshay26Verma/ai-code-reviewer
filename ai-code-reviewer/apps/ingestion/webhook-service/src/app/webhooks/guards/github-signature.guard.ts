import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { Request } from 'express';

@Injectable()
export class GithubSignatureGuard implements CanActivate {
  private readonly logger = new Logger(GithubSignatureGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { rawBody?: Buffer }>();
    const signature = request.headers['x-hub-signature-256'] as string | undefined;

    if (!signature) {
      throw new UnauthorizedException('Missing X-Hub-Signature-256 header');
    }

    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!secret) {
      this.logger.error('GITHUB_WEBHOOK_SECRET is not configured');
      throw new UnauthorizedException('Webhook secret not configured');
    }

    const rawBody = request.rawBody;
    if (!rawBody) {
      this.logger.error('Raw body not available — ensure rawBody: true is set in NestFactory.create');
      throw new UnauthorizedException('Cannot verify signature: raw body unavailable');
    }

    const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;

    try {
      const expectedBuf = Buffer.from(expected);
      const receivedBuf = Buffer.from(signature);
      if (
        expectedBuf.length !== receivedBuf.length ||
        !timingSafeEqual(expectedBuf, receivedBuf)
      ) {
        throw new UnauthorizedException('Invalid GitHub webhook signature');
      }
    } catch {
      throw new UnauthorizedException('Invalid GitHub webhook signature');
    }

    return true;
  }
}
