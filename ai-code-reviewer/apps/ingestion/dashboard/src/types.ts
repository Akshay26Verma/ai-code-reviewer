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
