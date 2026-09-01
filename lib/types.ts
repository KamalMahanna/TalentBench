// ── TalentBench API contract types ──────────────────────────────────────────
// These interfaces define the shape of data the frontend expects from the
// backend. The backend team can implement against this contract; the frontend
// is fully driven by mock data shaped to these types today.

export type RoundType =
  | 'resume_screen'
  | 'aptitude_test'
  | 'dsa_round'
  | 'interview'
  | 'custom';

export type InputSource = 'excel_upload' | 'manual_entry' | 'ai_generated_link';

export type CandidateStatus =
  | 'applied'
  | 'screened'
  | 'tested'
  | 'interviewed'
  | 'hired'
  | 'rejected';

export interface Round {
  id: string;
  role_id: string;
  name: string;
  type: RoundType;
  order: number;
  input_source: InputSource;
  ai_scored: boolean;
  cutoff_threshold: number; // 0–100 score threshold
  cutoff_type?: 'percentage' | 'count'; // 'percentage' or 'count' (number of resumes)
  cutoff_count?: number | null; // e.g. 300 resumes
  mail_template: string;
  created_at: string;
}

export interface Role {
  id: string;
  org_id: string;
  title: string;
  department: string;
  location: string;
  employment_type: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
  description: string;
  status: 'draft' | 'active' | 'closed' | 'archived';
  created_at: string;
  applicant_count: number;
  rounds: Round[];
}

export interface FunnelStage {
  stage: CandidateStatus;
  count: number;
}

export interface BenchmarkProject {
  id?: string;
  title: string;
  description: string;
  technologies: string[];
  complexity_score: number;
}

export interface BenchmarkProfile {
  shortlisted_count: number;
  avg_resume_score: number;
  avg_test_score: number;
  avg_interview_score: number;
  top_skills: string[];
  top_projects?: BenchmarkProject[];
  avg_experience_years: number;
}

export interface RoundResult {
  id: string;
  candidate_id: string;
  round_id: string;
  round_name: string;
  round_type: RoundType;
  status: 'passed' | 'failed' | 'pending' | 'skipped';
  score: number; // 0–100
  ai_verdict: string;
  ai_summary: string;
  evaluated_at: string;
  overridden: boolean;
  override_reason?: string;
  overridden_by?: string;
  overridden_at?: string;
}

export interface SkillScore {
  skill: string;
  candidate_score: number; // 0–100
  benchmark_score: number; // 0–100
}

export interface CategoryScore {
  category: string;
  candidate_score: number;
  benchmark_score: number;
}

export interface Candidate {
  id: string;
  role_id: string;
  name: string;
  email: string;
  phone: string;
  avatar_url: string;
  resume_url: string;
  status: CandidateStatus;
  current_round: number;
  overall_score: number;
  applied_at: string;
  experience_years: number;
  current_company: string;
  skills: string[];
  projects: string[];
  education: string;
  location: string;
  ai_match_score: number; // vs JD
  resume_text?: string;
  rank?: number;
  comparative_feedback?: string;
  round_results: RoundResult[];
}

export interface AuditLog {
  id: string;
  candidate_id: string;
  action: string;
  actor: string;
  actor_type: 'ai' | 'recruiter' | 'system';
  detail: string;
  timestamp: string;
}

export interface PerformanceReport {
  candidate_id: string;
  candidate_name: string;
  role_title: string;
  company_name: string;
  generated_at: string;
  outcome: 'passed' | 'shortlisted' | 'rejected';
  overall_percentile: number; // vs cohort
  resume_match: SkillScore[];
  project_depth: CategoryScore[];
  aptitude_breakdown: CategoryScore[];
  communication_rubric: CategoryScore[];
  radar_scores: {
    dimension: string;
    candidate: number;
    benchmark: number;
  }[];
  ai_feedback: string;
  improvement_areas: string[];
  strengths: string[];
}

export interface OrgMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'recruiter' | 'viewer';
  avatar_url: string;
  last_active: string;
}

export interface Organization {
  id: string;
  name: string;
  logo_url: string;
  plan: 'free' | 'pro' | 'enterprise';
  seats_used: number;
  seats_total: number;
}

export interface DashboardStats {
  total_roles: number;
  active_roles: number;
  total_candidates: number;
  hired_this_month: number;
  avg_time_to_hire_days: number;
  pipeline_value: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  org_id: string;
  token: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export interface LiveUpdateEvent {
  type: 'candidate_status' | 'new_candidate' | 'round_complete' | 'bulk_progress';
  payload: {
    candidate_id?: string;
    role_id?: string;
    status?: CandidateStatus;
    progress?: number;
    message?: string;
  };
}
