import { PREvent } from '@ai-code-reviewer/types';

export interface NormalizeResult {
  event: PREvent;
  isMerge: boolean;
  /**
   * Present only on GitHub merge events — the App installation ID
   * needed to request an installation token for API calls.
   */
  installationId?: number;
  /** SCM-specific identifiers needed to fetch changed files */
  scmMeta: GithubMeta | GitlabMeta;
}

export interface GithubMeta {
  provider: 'github';
  owner: string;
  repo: string;
  prNumber: number;
  installationId: number;
}

export interface GitlabMeta {
  provider: 'gitlab';
  projectId: string | number;
  mrIid: number;
  commitSha: string;
}
