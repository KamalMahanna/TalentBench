export interface AgentTraceStep {
  stepName: string;
  category: "EXPERIENCE_VALIDATION" | "STACK_EXTRACTION" | "IMPACT_ANALYSIS" | "RECOMMENDATION";
  timestamp: string;
  status: "PASSED" | "FAILED" | "WARNING" | "INFO";
  reasoning: string;
  metric?: string;
}

export interface ScreeningResult {
  candidateName?: string;
  score: number;
  passed: boolean;
  status: "SHORTLISTED" | "REJECTED";
  agentTrace: AgentTraceStep[];
  feedbackSummary: string;
  personalizedReply: string;
  promptInjectionDetected?: boolean;
  securityFlag?: string;
}

export interface ScreeningEvaluation {
  candidateName?: string;
  verdict: "YES" | "NO";
  matches: boolean;
  score: number; // 0 - 100
  matchPercentage: number;
  experienceMatch: boolean;
  experienceAnalysis: string;
  matchedSkills: string[];
  missingSkills: string[];
  reasoning: string;
  mailBody: string; // Body part only explaining what is missing (or congratulating if YES)
  promptInjectionDetected?: boolean;
  securityFlag?: string;
}

