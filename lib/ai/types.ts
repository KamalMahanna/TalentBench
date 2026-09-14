export interface AgentTraceStep {
  stepName: string;
  category: "EXPERIENCE_VALIDATION" | "STACK_EXTRACTION" | "IMPACT_ANALYSIS" | "RECOMMENDATION";
  timestamp: string;
  status: "PASSED" | "FAILED" | "WARNING" | "INFO";
  reasoning: string;
  metric?: string;
}

export interface ScreeningResult {
  score: number;
  passed: boolean;
  status: "SHORTLISTED" | "REJECTED";
  agentTrace: AgentTraceStep[];
  feedbackSummary: string;
  personalizedReply: string;
}

