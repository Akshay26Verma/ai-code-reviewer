import { z } from 'zod';
import type { PREvent } from '@ai-code-reviewer/types';

export const PREventSchema: z.ZodType<PREvent> = z.object({
  repo_id: z.string(),
  org_id: z.string(),
  pr_id: z.number(),
  action: z.enum(['opened', 'updated', 'closed', 'merged']),
  commit_sha: z.string(),
  provider: z.enum(['github', 'gitlab', 'bitbucket']),
});
