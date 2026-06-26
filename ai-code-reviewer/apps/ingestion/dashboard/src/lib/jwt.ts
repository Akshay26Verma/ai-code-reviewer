import { createHmac } from 'crypto';

/**
 * Mints an HS256 JWT compatible with the api-gateway JwtGuard.
 * The guard verifies: createHmac('sha256', JWT_SECRET).update('header.payload').digest('base64url')
 */
export function mintApiToken(githubId: string, login: string, expiresInSeconds = 86400): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({ sub: githubId, login, iat: now, exp: now + expiresInSeconds }),
  ).toString('base64url');
  const sig = createHmac('sha256', process.env.JWT_SECRET!)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${sig}`;
}
