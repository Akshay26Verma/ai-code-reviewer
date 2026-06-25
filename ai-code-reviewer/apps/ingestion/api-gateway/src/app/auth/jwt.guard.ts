import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { Request } from 'express';

interface JwtPayload {
  sub: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

function base64urlDecode(str: string): string {
  const padded = str + '='.repeat((4 - (str.length % 4)) % 4);
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

@Injectable()
export class JwtGuard implements CanActivate {
  private readonly logger = new Logger(JwtGuard.name);
  private readonly secret = process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production';

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers['authorization'];

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.slice(7);
    const parts = token.split('.');

    if (parts.length !== 3) {
      throw new UnauthorizedException('Invalid token format');
    }

    const [headerB64, payloadB64, sigB64] = parts;
    const signingInput = `${headerB64}.${payloadB64}`;

    const expectedSig = createHmac('sha256', this.secret)
      .update(signingInput)
      .digest('base64url');

    const expectedBuf = Buffer.from(expectedSig);
    const actualBuf = Buffer.from(sigB64);

    if (
      expectedBuf.length !== actualBuf.length ||
      !timingSafeEqual(expectedBuf, actualBuf)
    ) {
      throw new UnauthorizedException('Invalid token signature');
    }

    let payload: JwtPayload;
    try {
      payload = JSON.parse(base64urlDecode(payloadB64));
    } catch {
      throw new UnauthorizedException('Invalid token payload');
    }

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('Token expired');
    }

    (request as Request & { user: JwtPayload }).user = payload;
    return true;
  }
}
