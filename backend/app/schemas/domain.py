from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

# ── Enum & Literal Types ───────────────────────────────────────────────────

RoundType = Literal[
    "resume_screen", "aptitude_test", "dsa_round", "interview", "custom"
]

InputSource = Literal["excel_upload", "manual_entry", "ai_generated_link"]

CandidateStatus = Literal[
    "applied", "screened", "tested", "interviewed", "hired", "rejected"
]

EmploymentType = Literal["Full-time", "Part-time", "Contract", "Internship"]

RoleStatus = Literal["draft", "active", "closed", "archived"]

RoundResultStatus = Literal["passed", "failed", "pending", "skipped"]

ActorType = Literal["ai", "recruiter", "system"]

OrgPlan = Literal["free", "pro", "enterprise"]

MemberRole = Literal["admin", "recruiter", "viewer"]

OutcomeType = Literal["passed", "shortlisted", "rejected"]

LiveUpdateEventType = Literal[
    "candidate_status", "new_candidate", "round_complete", "bulk_progress"
]


# ── Round Schema ──────────────────────────────────────────────────────────


class RoundBase(BaseModel):
    name: str = "Untitled Round"
    type: RoundType = "custom"
    order: int = 0
    input_source: InputSource = "manual_entry"
    ai_scored: bool = True
    cutoff_threshold: int = Field(default=60, ge=0, le=100)
    cutoff_type: str = "percentage"  # "percentage" or "count"
    cutoff_count: int | None = None  # e.g. 300 resumes
    mail_template: str = ""


class RoundCreate(RoundBase):
    pass


class RoundUpdate(BaseModel):
    id: str | None = None
    role_id: str | None = None
    name: str | None = None
    type: RoundType | None = None
    order: int | None = None
    input_source: InputSource | None = None
    ai_scored: bool | None = None
    cutoff_threshold: int | None = None
    cutoff_type: str | None = None
    cutoff_count: int | None = None
    mail_template: str | None = None


class Round(RoundBase):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    role_id: str
    created_at: str


# ── Role Schema ───────────────────────────────────────────────────────────


class RoleBase(BaseModel):
    title: str = "Untitled Role"
    department: str = "Engineering"
    location: str = "Remote"
    employment_type: EmploymentType = "Full-time"
    description: str = ""
    status: RoleStatus = "draft"


class RoleCreate(BaseModel):
    title: str = "Untitled Role"
    department: str = "Engineering"
    location: str = "Remote"
    employment_type: EmploymentType = "Full-time"
    description: str = ""
    status: RoleStatus = "draft"


class RoleUpdate(BaseModel):
    title: str | None = None
    department: str | None = None
    location: str | None = None
    employment_type: EmploymentType | None = None
    description: str | None = None
    status: RoleStatus | None = None


class Role(RoleBase):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    org_id: str
    created_at: str
    applicant_count: int = 0
    rounds: list[Round] = []


# ── Round Result Schema ───────────────────────────────────────────────────


class RoundResultBase(BaseModel):
    round_name: str
    round_type: RoundType
    status: RoundResultStatus = "pending"
    score: int = Field(default=0, ge=0, le=100)
    ai_verdict: str = ""
    ai_summary: str = ""
    evaluated_at: str
    overridden: bool = False
    override_reason: str | None = None
    overridden_by: str | None = None
    overridden_at: str | None = None


class RoundResult(RoundResultBase):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    candidate_id: str
    round_id: str


class DecisionOverrideRequest(BaseModel):
    new_status: Literal["passed", "failed"] | None = Field(
        default=None, alias="newStatus"
    )
    status: Literal["passed", "failed"] | None = None
    reason: str = "Manual override"
    round_id: str | None = Field(default=None, alias="roundId")

    @property
    def target_status(self) -> Literal["passed", "failed"]:
        return self.new_status or self.status or "passed"


# ── Candidate Schema ──────────────────────────────────────────────────────


class CandidateBase(BaseModel):
    name: str
    email: str
    phone: str = ""
    avatar_url: str = ""
    resume_url: str = ""
    status: CandidateStatus = "applied"
    current_round: int = 0
    overall_score: int = 0
    applied_at: str
    experience_years: int = 0
    current_company: str = ""
    skills: list[str] = []
    projects: list[str] = []
    education: str = ""
    location: str = ""
    ai_match_score: int = 0


class CandidateCreate(CandidateBase):
    role_id: str
    consent_on_file: bool = True


class Candidate(CandidateBase):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    role_id: str
    round_results: list[RoundResult] = []


# ── Benchmark Profile Schema ──────────────────────────────────────────────


class BenchmarkProfile(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    shortlisted_count: int = 0
    avg_resume_score: float = 0.0
    avg_test_score: float = 0.0
    avg_interview_score: float = 0.0
    top_skills: list[str] = []
    avg_experience_years: float = 0.0


# ── Audit Log Schema ──────────────────────────────────────────────────────


class AuditLog(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    candidate_id: str
    action: str
    actor: str
    actor_type: ActorType
    detail: str
    timestamp: str


# ── Performance Report Schema ─────────────────────────────────────────────


class SkillScore(BaseModel):
    skill: str
    candidate_score: int
    benchmark_score: int


class CategoryScore(BaseModel):
    category: str
    candidate_score: int
    benchmark_score: int


class RadarScore(BaseModel):
    dimension: str
    candidate: int
    benchmark: int


class PerformanceReport(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    candidate_id: str
    candidate_name: str
    role_title: str
    company_name: str
    generated_at: str
    outcome: OutcomeType
    overall_percentile: int
    resume_match: list[SkillScore]
    project_depth: list[CategoryScore]
    aptitude_breakdown: list[CategoryScore]
    communication_rubric: list[CategoryScore]
    radar_scores: list[RadarScore]
    ai_feedback: str
    improvement_areas: list[str]
    strengths: list[str]


# ── Organization & Member Schemas ─────────────────────────────────────────


class Organization(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    name: str
    logo_url: str = ""
    plan: OrgPlan = "pro"
    seats_used: int = 1
    seats_total: int = 15


class OrganizationUpdate(BaseModel):
    name: str | None = None
    logo_url: str | None = None
    plan: OrgPlan | None = None
    seats_total: int | None = None


class OrgMember(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    name: str
    email: str
    role: MemberRole
    avatar_url: str = ""
    last_active: str


class OrgMemberInvite(BaseModel):
    email: str
    role: MemberRole = "recruiter"


# ── Auth Schemas ──────────────────────────────────────────────────────────


class AuthUser(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    email: str
    name: str
    avatar_url: str = ""
    org_id: str
    token: str


class LoginRequest(BaseModel):
    email: str
    password: str = ""


class SignupRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    email: str
    name: str
    org_name: str = Field(default="", alias="orgName")


# ── Dashboard Stats Schema ────────────────────────────────────────────────


class DashboardStats(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    total_roles: int = 0
    active_roles: int = 0
    total_candidates: int = 0
    hired_this_month: int = 0
    avg_time_to_hire_days: int = 0
    pipeline_value: int = 0


# ── Live Updates & Upload Schemas ─────────────────────────────────────────


class LiveUpdatePayload(BaseModel):
    candidate_id: str | None = None
    role_id: str | None = None
    status: CandidateStatus | None = None
    progress: int | None = None
    message: str | None = None


class LiveUpdateEvent(BaseModel):
    type: LiveUpdateEventType
    payload: LiveUpdatePayload


class BulkUploadFileItem(BaseModel):
    name: str
    size: int


class BulkUploadRequest(BaseModel):
    files: list[BulkUploadFileItem] = []


class BulkUploadResponse(BaseModel):
    uploaded: int
    failed: int
    batch_id: str | None = None


class ParseJobDescriptionResponse(BaseModel):
    filename: str
    text: str
    suggested_title: str | None = None
