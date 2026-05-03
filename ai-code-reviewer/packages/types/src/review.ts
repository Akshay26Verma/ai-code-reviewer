import { Finding, SemanticComment, BugPrediction } from './analysis';

export interface Comment {
  id: string;
  file: string;
  line: number;
  body: string;
  type: 'static' | 'semantic' | 'prediction';
}

export interface Score {
  value: number; // 0-100
  factors: string[];
}

export interface Review {
  pr_id: number;
  repo_id: string;
  score: Score;
  comments: Comment[];
  status: 'complete' | 'partial';
  findings: Finding[];
  semantic_comments: SemanticComment[];
  predictions: BugPrediction[];
}
