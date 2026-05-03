import { z } from 'zod';
import type { DeveloperInsight, TeamSummary } from '@ai-code-reviewer/types';

export const DeveloperInsightSchema: z.ZodType<DeveloperInsight> = z.object({
  developer_id: z.string(),
  repo_id: z.string(),
  null_check_miss_rate: z.number(),
  regression_rate: z.number(),
  window: z.string(),
});

export const TeamSummarySchema: z.ZodType<TeamSummary> = z.object({
  team_id: z.string(),
  average_score: z.number(),
  critical_findings_count: z.number(),
  top_risk_areas: z.array(z.string()),
});
