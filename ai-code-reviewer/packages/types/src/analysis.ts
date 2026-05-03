export interface Finding {
  file: string;
  line: number;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  rule_id: string;
  tool: 'semgrep' | 'codeql' | 'tree-sitter';
}

export interface SemanticComment {
  file: string;
  line: number;
  comment: string;
  confidence: number;
}

export interface BugPrediction {
  category: 'null_pointer' | 'race_condition' | 'memory_leak' | 'other';
  confidence: number;
  location: {
    file: string;
    line: number;
  };
  reasoning: string;
  status: 'active' | 'degraded';
}
