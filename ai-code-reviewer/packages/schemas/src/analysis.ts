import { z } from 'zod';
import type { Finding, SemanticComment, BugPrediction } from '@ai-code-reviewer/types';

export const FindingSchema: z.ZodType<Finding> = z.object({
  file: z.string(),
  line: z.number(),
  message: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  rule_id: z.string(),
  tool: z.enum(['semgrep', 'codeql', 'tree-sitter']),
});

export const SemanticCommentSchema: z.ZodType<SemanticComment> = z.object({
  file: z.string(),
  line: z.number(),
  comment: z.string(),
  confidence: z.number(),
});

export const BugPredictionSchema: z.ZodType<BugPrediction> = z.object({
  category: z.enum(['null_pointer', 'race_condition', 'memory_leak', 'other']),
  confidence: z.number(),
  location: z.object({
    file: z.string(),
    line: z.number(),
  }),
  reasoning: z.string(),
  status: z.enum(['active', 'degraded']),
});
