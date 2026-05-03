export interface PREvent {
  repo_id: string;
  org_id: string;
  pr_id: number;
  action: 'opened' | 'updated' | 'closed' | 'merged';
  commit_sha: string;
  provider: 'github' | 'gitlab' | 'bitbucket';
}
