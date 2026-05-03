import { z } from 'zod';
import type { Comment, Score, Review } from '@ai-code-reviewer/types';
import { FindingSchema, SemanticCommentSchema, BugPredictionSchema } from './analysis';

export const CommentSchema: z.ZodType<Comment> = z.object({
  id: z.string(),
  file: z.string(),
  line: z.number(),
  body: z.string(),
  type: z.enum(['static', 'semantic', 'prediction']),
});

export const ScoreSchema: z.ZodType<Score> = z.object({
  value: z.number(),
  factors: z.array(z.string()),
});

export const ReviewSchema: z.ZodType<Review> = z.object({
  pr_id: z.number(),
  repo_id: z.string(),
  score: ScoreSchema,
  comments: z.array(CommentSchema),
  status: z.enum(['complete', 'partial']),
  findings: z.array(FindingSchema),
  semantic_comments: z.array(SemanticCommentSchema),
  predictions: z.array(BugPredictionSchema),
});
