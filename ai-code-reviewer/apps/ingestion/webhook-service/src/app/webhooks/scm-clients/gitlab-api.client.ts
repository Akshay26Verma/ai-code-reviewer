import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PRFileChange } from '@ai-code-reviewer/types';

interface GitlabDiff {
  old_path: string;
  new_path: string;
  new_file: boolean;
  deleted_file: boolean;
  renamed_file: boolean;
}

@Injectable()
export class GitlabApiClient {
  private readonly logger = new Logger(GitlabApiClient.name);

  private get baseUrl(): string {
    return process.env.GITLAB_URL || 'https://gitlab.com';
  }

  private get token(): string {
    const t = process.env.GITLAB_TOKEN;
    if (!t) throw new Error('GITLAB_TOKEN env var is not set');
    return t;
  }

  async getMRFiles(
    projectId: string | number,
    mrIid: number,
    commitSha: string,
  ): Promise<PRFileChange[]> {
    const headers = { 'PRIVATE-TOKEN': this.token };
    const encodedProjectId = encodeURIComponent(String(projectId));

    const { data: diffs } = await axios.get<GitlabDiff[]>(
      `${this.baseUrl}/api/v4/projects/${encodedProjectId}/merge_requests/${mrIid}/diffs`,
      { headers },
    );

    const result: PRFileChange[] = [];

    for (const diff of diffs) {
      const filePath = diff.new_path || diff.old_path;
      const status = this.resolveStatus(diff);

      if (status === 'removed') {
        result.push({ filename: filePath, content: '', status: 'removed' });
        continue;
      }

      try {
        const { data: content } = await axios.get<string>(
          `${this.baseUrl}/api/v4/projects/${encodedProjectId}/repository/files/${encodeURIComponent(filePath)}/raw`,
          { headers, params: { ref: commitSha }, responseType: 'text' },
        );
        result.push({ filename: filePath, content, status });
      } catch (err) {
        this.logger.warn(`Could not fetch content for ${filePath}: ${(err as Error).message}`);
        result.push({ filename: filePath, content: '', status });
      }
    }

    return result;
  }

  private resolveStatus(diff: GitlabDiff): PRFileChange['status'] {
    if (diff.deleted_file) return 'removed';
    if (diff.renamed_file) return 'renamed';
    if (diff.new_file) return 'added';
    return 'modified';
  }
}
