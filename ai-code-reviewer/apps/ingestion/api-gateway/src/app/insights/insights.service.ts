import { Injectable } from '@nestjs/common';
import { DeveloperInsight, TeamSummary } from '@ai-code-reviewer/types';

@Injectable()
export class InsightsService {
  getDeveloperInsights(developerId: string): DeveloperInsight {
    return {
      developer_id: developerId,
      repo_id: '',
      null_check_miss_rate: 0,
      regression_rate: 0,
      window: '30d',
    };
  }

  getTeamSummary(teamId: string): TeamSummary {
    return {
      team_id: teamId,
      average_score: 0,
      critical_findings_count: 0,
      top_risk_areas: [],
    };
  }
}
