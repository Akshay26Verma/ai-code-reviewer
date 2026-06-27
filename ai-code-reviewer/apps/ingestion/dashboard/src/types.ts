export interface ReviewComment {
  id: string;
  reviewId: string;
  file: string;
  line: number;
  body: string;
  severity: string;
}

export interface Review {
  id: string;
  prId: number;
  repoId: string;
  orgId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  comments: ReviewComment[];
}

export interface AnalyzeRequest {
  pr_id: number;
  repo_id: string;
  org_id: string;
  base_ref: string;
  head_ref: string;
  changed_files: string[];
  removed_files?: string[];
}

export interface UserRepo {
  id: string;
  userLogin: string;
  owner: string;
  name: string;
  fullName: string;
  isOwned: boolean;
  addedAt: string;
  lastPrPollAt: string | null;
  openPrCount: number;
}

export interface GithubRepo {
  owner: { login: string };
  name: string;
  full_name: string;
  permissions?: { pull: boolean };
}

export interface GithubPR {
  number: number;
  title: string;
  user: { login: string };
  state: string;
  head: { sha: string };
  created_at: string;
  updated_at: string;
}

export interface PullRequest {
  id: string;
  owner: string;
  repo: string;
  prNumber: number;
  title: string;
  author: string;
  state: string;
  commitSha: string;
  createdAt: string;
  updatedAt: string;
  cachedAt: string;
}
