export interface PREvent {
  repo_id: string;
  org_id: string;
  pr_id: number;
  action: 'opened' | 'updated' | 'closed' | 'merged';
  commit_sha: string;
  provider: 'github' | 'gitlab' | 'bitbucket';
}

export interface PRFileChange {
  filename: string;
  content: string;
  status: 'added' | 'modified' | 'removed' | 'renamed';
}

export interface MergedPREvent extends PREvent {
  action: 'merged';
  files: PRFileChange[];
}
