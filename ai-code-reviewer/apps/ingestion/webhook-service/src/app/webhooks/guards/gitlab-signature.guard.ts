import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { Request } from 'express';

@Injectable()
export class GitlabSignatureGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.headers['x-gitlab-token'] as string | undefined;

    if (!token) {
      throw new UnauthorizedException('Missing X-Gitlab-Token header');
    }

    const secret = process.env.GITLAB_WEBHOOK_SECRET;
    if (!secret) {
      throw new UnauthorizedException('Webhook secret not configured');
    }

    const expectedBuf = Buffer.from(secret);
    const receivedBuf = Buffer.from(token);

    if (
      expectedBuf.length !== receivedBuf.length ||
      !timingSafeEqual(expectedBuf, receivedBuf)
    ) {
      throw new UnauthorizedException('Invalid GitLab webhook token');
    }

    return true;
  }
}
