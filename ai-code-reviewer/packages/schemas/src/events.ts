import { z } from 'zod';
import type { PREvent, MergedPREvent } from '@ai-code-reviewer/types';

const PREventBase = z.object({
  repo_id: z.string(),
  org_id: z.string(),
  pr_id: z.number(),
  action: z.enum(['opened', 'updated', 'closed', 'merged']),
  commit_sha: z.string(),
  provider: z.enum(['github', 'gitlab', 'bitbucket']),
});

export const PREventSchema: z.ZodType<PREvent> = PREventBase;

export const PRFileChangeSchema = z.object({
  filename: z.string(),
  content: z.string(),
  status: z.enum(['added', 'modified', 'removed', 'renamed']),
});

export const MergedPREventSchema: z.ZodType<MergedPREvent> = PREventBase.extend({
  action: z.literal('merged'),
  files: z.array(PRFileChangeSchema),
});
