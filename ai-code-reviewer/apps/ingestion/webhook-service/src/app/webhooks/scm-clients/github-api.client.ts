import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PRFileChange } from '@ai-code-reviewer/types';
import { GithubAppService } from './github-app.service';

interface GithubPRFile {
  filename: string;
  status: 'added' | 'modified' | 'removed' | 'renamed' | 'copied' | 'changed' | 'unchanged';
  raw_url: string;
  contents_url: string;
}

@Injectable()
export class GithubApiClient {
  private readonly logger = new Logger(GithubApiClient.name);

  constructor(private readonly githubApp: GithubAppService) {}

  async getPRFiles(
    owner: string,
    repo: string,
    prNumber: number,
    installationId: number,
  ): Promise<PRFileChange[]> {
    const token = await this.githubApp.getInstallationToken(installationId);
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    // Paginate through all changed files (max 300 files per PR via GitHub API)
    const allFiles: GithubPRFile[] = [];
    let page = 1;
    while (true) {
      const { data } = await axios.get<GithubPRFile[]>(
        `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`,
        { headers, params: { per_page: 100, page } },
      );
      allFiles.push(...data);
      if (data.length < 100) break;
      page++;
    }

    const result: PRFileChange[] = [];

    for (const file of allFiles) {
      const normalizedStatus = this.normalizeStatus(file.status);
      if (normalizedStatus === 'removed') {
        result.push({ filename: file.filename, content: '', status: 'removed' });
        continue;
      }

      try {
        const { data: content } = await axios.get<string>(file.raw_url, {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'text',
        });
        result.push({ filename: file.filename, content, status: normalizedStatus });
      } catch (err) {
        this.logger.warn(`Could not fetch content for ${file.filename}: ${(err as Error).message}`);
        result.push({ filename: file.filename, content: '', status: normalizedStatus });
      }
    }

    return result;
  }

  private normalizeStatus(
    status: GithubPRFile['status'],
  ): PRFileChange['status'] {
    if (status === 'removed') return 'removed';
    if (status === 'renamed') return 'renamed';
    if (status === 'added') return 'added';
    return 'modified';
  }
}
