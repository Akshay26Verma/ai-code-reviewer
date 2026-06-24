import { Injectable, Logger } from '@nestjs/common';
import { createSign } from 'crypto';
import axios from 'axios';

interface InstallationTokenCache {
  token: string;
  expiresAt: number;
}

@Injectable()
export class GithubAppService {
  private readonly logger = new Logger(GithubAppService.name);
  private readonly tokenCache = new Map<number, InstallationTokenCache>();

  private get appId(): string {
    const id = process.env.GITHUB_APP_ID;
    if (!id) throw new Error('GITHUB_APP_ID env var is not set');
    return id;
  }

  private get privateKey(): string {
    const key = process.env.GITHUB_APP_PRIVATE_KEY;
    if (!key) throw new Error('GITHUB_APP_PRIVATE_KEY env var is not set');
    // Support base64-encoded PEM (no newlines in env) or raw PEM
    const decoded = Buffer.from(key, 'base64').toString('utf-8');
    return decoded.startsWith('-----') ? decoded : key;
  }

  private createAppJwt(): string {
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({ iat: now - 60, exp: now + 600, iss: this.appId }),
    ).toString('base64url');

    const signingInput = `${header}.${payload}`;
    const sign = createSign('RSA-SHA256');
    sign.update(signingInput);
    const signature = sign.sign(this.privateKey, 'base64url');

    return `${signingInput}.${signature}`;
  }

  async getInstallationToken(installationId: number): Promise<string> {
    const cached = this.tokenCache.get(installationId);
    // Reuse cached token if it has more than 60 seconds left
    if (cached && cached.expiresAt - Date.now() > 60_000) {
      return cached.token;
    }

    this.logger.debug(`Requesting new installation token for installation ${installationId}`);
    const jwt = this.createAppJwt();

    const response = await axios.post<{ token: string; expires_at: string }>(
      `https://api.github.com/app/installations/${installationId}/access_tokens`,
      {},
      {
        headers: {
          Authorization: `Bearer ${jwt}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    );

    const { token, expires_at } = response.data;
    this.tokenCache.set(installationId, {
      token,
      expiresAt: new Date(expires_at).getTime(),
    });

    return token;
  }
}
