export interface DeveloperInsight {
  developer_id: string;
  repo_id: string;
  null_check_miss_rate: number;
  regression_rate: number;
  window: string; // e.g., '30d'
}

export interface TeamSummary {
  team_id: string;
  average_score: number;
  critical_findings_count: number;
  top_risk_areas: string[];
}
