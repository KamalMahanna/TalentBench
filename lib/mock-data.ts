import { faker } from '@faker-js/faker';
import type {
  AuditLog,
  Candidate,
  CandidateStatus,
  DashboardStats,
  LiveUpdateEvent,
  Organization,
  OrgMember,
  PerformanceReport,
  Role,
  Round,
  RoundResult,
  RoundType,
  InputSource,
} from './types';

// Deterministic seed for reproducible demo data
faker.seed(42);

const ROUND_TEMPLATES: Omit<Round, 'id' | 'role_id' | 'order' | 'created_at'>[] = [
  {
    name: 'Resume Screen',
    type: 'resume_screen',
    input_source: 'excel_upload',
    ai_scored: true,
    cutoff_threshold: 60,
    mail_template: 'Hi {{name}}, your resume is being reviewed for {{role}}.',
  },
  {
    name: 'Aptitude & Reasoning',
    type: 'aptitude_test',
    input_source: 'ai_generated_link',
    ai_scored: true,
    cutoff_threshold: 70,
    mail_template: 'Hi {{name}}, please complete the aptitude test for {{role}}.',
  },
  {
    name: 'DSA Round',
    type: 'dsa_round',
    input_source: 'ai_generated_link',
    ai_scored: true,
    cutoff_threshold: 65,
    mail_template: 'Hi {{name}}, your DSA round for {{role}} is scheduled.',
  },
  {
    name: 'Technical Interview',
    type: 'interview',
    input_source: 'manual_entry',
    ai_scored: true,
    cutoff_threshold: 75,
    mail_template: 'Hi {{name}}, your interview for {{role}} is confirmed.',
  },
];

const SKILL_POOL = [
  'React', 'TypeScript', 'Node.js', 'Python', 'AWS', 'Docker',
  'GraphQL', 'PostgreSQL', 'Kubernetes', 'Go', 'Rust', 'Java',
  'System Design', 'Microservices', 'CI/CD', 'Redis', 'Kafka',
];

const PROJECT_POOL = [
  'Distributed Cache Engine', 'Real-time Collab Editor', 'ML Pipeline Orchestrator',
  'E-commerce Platform', 'Chat Infrastructure', 'Analytics Dashboard',
  'API Gateway', 'K8s Operator', 'Game Engine', 'Search Engine',
];

const DEPARTMENTS = ['Engineering', 'Data Science', 'Product', 'Design', 'DevOps', 'Security'];
const LOCATIONS = ['San Francisco, US', 'Remote', 'London, UK', 'Bangalore, IN', 'Berlin, DE', 'New York, US'];
const COMPANIES = ['Stripe', 'Vercel', 'Linear', 'Figma', 'Notion', 'Airbnb', 'Shopify', 'Datadog', 'Snowflake', 'Ramp'];

function makeRounds(roleId: string): Round[] {
  return ROUND_TEMPLATES.map((tpl, i) => ({
    ...tpl,
    id: faker.string.uuid(),
    role_id: roleId,
    order: i,
    created_at: faker.date.past().toISOString(),
  }));
}

function makeRoundResults(candidateId: string, rounds: Round[], status: CandidateStatus, currentRound: number): RoundResult[] {
  return rounds.slice(0, currentRound).map((round, i) => {
    const isLast = i === currentRound - 1;
    const passed = isLast
      ? status === 'hired' || (status !== 'rejected' && faker.datatype.boolean(0.75))
      : true;
    const score = faker.number.int({ min: passed ? round.cutoff_threshold : 30, max: 98 });
    return {
      id: faker.string.uuid(),
      candidate_id: candidateId,
      round_id: round.id,
      round_name: round.name,
      round_type: round.type,
      status: passed ? 'passed' : 'failed',
      score,
      ai_verdict: passed
        ? `Candidate demonstrates strong ${round.type === 'resume_screen' ? 'resume alignment' : round.type === 'aptitude_test' ? 'reasoning ability' : 'technical proficiency'} with a score of ${score}/100.`
        : `Score of ${score}/100 falls below the cutoff of ${round.cutoff_threshold}. Key gaps identified in ${round.type === 'dsa_round' ? 'problem decomposition and optimal solution design' : 'core competencies'}.`,
      ai_summary: faker.lorem.paragraph(2),
      evaluated_at: faker.date.recent().toISOString(),
      overridden: faker.datatype.boolean(0.08),
      override_reason: faker.datatype.boolean(0.5) ? 'Recruiter override: strong portfolio despite low test score' : undefined,
      overridden_by: faker.datatype.boolean(0.5) ? faker.person.fullName() : undefined,
      overridden_at: faker.datatype.boolean(0.5) ? faker.date.recent().toISOString() : undefined,
    };
  });
}

function makeCandidate(roleId: string, rounds: Round[], index: number): Candidate {
  const name = faker.person.fullName();
  const statuses: CandidateStatus[] = ['applied', 'screened', 'tested', 'interviewed', 'hired', 'rejected'];
  // Weight toward earlier stages
  const weights = [0.35, 0.2, 0.15, 0.12, 0.08, 0.1];
  const status = faker.helpers.weightedArrayElement(
    statuses.map((s, i) => ({ value: s, weight: weights[i] })),
  );
  const currentRound = status === 'applied' ? 0
    : status === 'screened' ? 1
    : status === 'tested' ? 2
    : status === 'interviewed' ? 3
    : status === 'hired' ? 4
    : faker.number.int({ min: 1, max: 4 });
  const skills = faker.helpers.arrayElements(SKILL_POOL, { min: 3, max: 7 });
  const roundResults = makeRoundResults(faker.string.uuid(), rounds, status, currentRound);
  const overallScore = roundResults.length > 0
    ? Math.round(roundResults.reduce((a, r) => a + r.score, 0) / roundResults.length)
    : faker.number.int({ min: 0, max: 50 });

  return {
    id: faker.string.uuid(),
    role_id: roleId,
    name,
    email: faker.internet.email().toLowerCase(),
    phone: faker.phone.number(),
    avatar_url: `https://i.pravatar.cc/150?u=${index}`,
    resume_url: '#',
    status,
    current_round: currentRound,
    overall_score: overallScore,
    applied_at: faker.date.recent({ days: 30 }).toISOString(),
    experience_years: faker.number.int({ min: 0, max: 15 }),
    current_company: faker.helpers.arrayElement(COMPANIES),
    skills,
    projects: faker.helpers.arrayElements(PROJECT_POOL, { min: 1, max: 4 }),
    education: `${faker.person.jobTitle()} at ${faker.company.name()} University`,
    location: faker.helpers.arrayElement(LOCATIONS),
    ai_match_score: faker.number.int({ min: 40, max: 98 }),
    round_results: roundResults,
  };
}

function makePerformanceReport(candidate: Candidate, role: Role): PerformanceReport {
  const resumeSkills = candidate.skills.slice(0, 5);
  const radarDims = ['Resume Match', 'Project Depth', 'Aptitude', 'Communication', 'DSA Skills', 'Culture Fit'];
  return {
    candidate_id: candidate.id,
    candidate_name: candidate.name,
    role_title: role.title,
    company_name: 'TalentBench Demo Co.',
    generated_at: new Date().toISOString(),
    outcome: candidate.status === 'hired' ? 'passed' : candidate.status === 'rejected' ? 'rejected' : 'shortlisted',
    overall_percentile: faker.number.int({ min: 30, max: 99 }),
    resume_match: resumeSkills.map((skill) => ({
      skill,
      candidate_score: faker.number.int({ min: 50, max: 95 }),
      benchmark_score: faker.number.int({ min: 60, max: 90 }),
    })),
    project_depth: candidate.projects.map((p) => ({
      category: p,
      candidate_score: faker.number.int({ min: 40, max: 90 }),
      benchmark_score: faker.number.int({ min: 55, max: 88 }),
    })),
    aptitude_breakdown: ['Logical Reasoning', 'Quantitative', 'Verbal', 'Spatial'].map((c) => ({
      category: c,
      candidate_score: faker.number.int({ min: 30, max: 95 }),
      benchmark_score: faker.number.int({ min: 55, max: 85 }),
    })),
    communication_rubric: ['Clarity', 'Confidence', 'Technical Articulation', 'Active Listening'].map((c) => ({
      category: c,
      candidate_score: faker.number.int({ min: 40, max: 92 }),
      benchmark_score: faker.number.int({ min: 60, max: 88 }),
    })),
    radar_scores: radarDims.map((d) => ({
      dimension: d,
      candidate: faker.number.int({ min: 40, max: 95 }),
      benchmark: faker.number.int({ min: 60, max: 88 }),
    })),
    ai_feedback: `You demonstrated solid fundamentals in ${candidate.skills[0] ?? 'software engineering'} with a particular strength in ${candidate.skills[1] ?? 'problem-solving'}. Your project experience shows practical depth, though your aptitude scores suggest room for growth in quantitative reasoning. Compared to the ${faker.number.int({ min: 5, max: 20 })} shortlisted candidates, you ranked in the ${faker.helpers.arrayElement(['top 40%', 'middle quartile', 'top 25%'])} overall.`,
    improvement_areas: [
      'Strengthen quantitative reasoning — focus on time/complexity analysis in DSA problems',
      'Add more production-scale projects to demonstrate system design depth',
      'Practice articulating trade-offs in technical interviews',
    ],
    strengths: [
      `Strong ${candidate.skills[0] ?? 'technical'} foundation`,
      'Clear project documentation and architecture decisions',
      'Good communication scores in the interview round',
    ],
  };
}

function makeAuditLog(candidateId: string, candidate: Candidate): AuditLog[] {
  const logs: AuditLog[] = [
    {
      id: faker.string.uuid(),
      candidate_id: candidateId,
      action: 'Application received',
      actor: 'system',
      actor_type: 'system',
      detail: 'Resume uploaded and parsed successfully',
      timestamp: candidate.applied_at,
    },
  ];
  candidate.round_results.forEach((r) => {
    logs.push({
      id: faker.string.uuid(),
      candidate_id: candidateId,
      action: `Round evaluated: ${r.round_name}`,
      actor: 'AI Evaluator',
      actor_type: 'ai',
      detail: r.ai_verdict,
      timestamp: r.evaluated_at,
    });
    if (r.overridden) {
      logs.push({
        id: faker.string.uuid(),
        candidate_id: candidateId,
        action: 'Decision overridden',
        actor: r.overridden_by ?? 'Recruiter',
        actor_type: 'recruiter',
        detail: r.override_reason ?? 'Manual override applied',
        timestamp: r.overridden_at ?? r.evaluated_at,
      });
    }
  });
  return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// ── Singleton store ──────────────────────────────────────────────────────────
class MockDataStore {
  private org: Organization = {
    id: faker.string.uuid(),
    name: 'TalentBench Demo Co.',
    logo_url: '',
    plan: 'pro',
    seats_used: 8,
    seats_total: 15,
  };

  private recruiter: { [email: string]: import('./types').AuthUser } = {};

  private roles: Role[] = [];
  private candidates: { [roleId: string]: Candidate[] } = {};
  private members: OrgMember[] = [];

  constructor() {
    this.seedRoles();
    this.seedMembers();
    this.seedRecruiter();
  }

  private seedRecruiter() {
    const email = 'recruiter@talentbench.io';
    this.recruiter[email] = {
      id: faker.string.uuid(),
      email,
      name: 'Alex Morgan',
      avatar_url: 'https://i.pravatar.cc/150?u=recruiter',
      org_id: this.org.id,
      token: 'mock-jwt-token-' + faker.string.alphanumeric(24),
    };
  }

  private seedRoles() {
    const titles = [
      'Senior Frontend Engineer',
      'Backend Engineer',
      'Staff Platform Engineer',
      'Product Designer',
      'Data Scientist',
      'DevOps Engineer',
    ];
    titles.forEach((title, i) => {
      const id = faker.string.uuid();
      const rounds = makeRounds(id);
      const role: Role = {
        id,
        org_id: this.org.id,
        title,
        department: DEPARTMENTS[i % DEPARTMENTS.length],
        location: faker.helpers.arrayElement(LOCATIONS),
        employment_type: faker.helpers.arrayElement(['Full-time', 'Contract'] as const),
        description: faker.lorem.paragraphs(2),
        status: i < 4 ? 'active' : i === 4 ? 'draft' : 'closed',
        created_at: faker.date.recent({ days: 60 }).toISOString(),
        applicant_count: 0,
        rounds,
      };
      const count = i < 2 ? faker.number.int({ min: 8000, max: 12000 }) : faker.number.int({ min: 50, max: 500 });
      role.applicant_count = count;
      // Generate a smaller set for the table; the rest are "virtual"
      const tableCount = Math.min(count, 200);
      this.candidates[id] = Array.from({ length: tableCount }, (_, j) =>
        makeCandidate(id, rounds, j + i * 1000),
      );
      this.roles.push(role);
    });
  }

  private seedMembers() {
    this.members = Array.from({ length: 7 }, (_, i) => ({
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      email: faker.internet.email().toLowerCase(),
      role: i === 0 ? 'admin' : i < 4 ? 'recruiter' : 'viewer',
      avatar_url: `https://i.pravatar.cc/150?u=member${i}`,
      last_active: faker.date.recent({ days: 7 }).toISOString(),
    }));
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  getRecruiter(email: string) {
    return this.recruiter[email] ?? this.recruiter['recruiter@talentbench.io'];
  }

  createRecruiter(email: string, name: string, _orgName: string) {
    const user = {
      id: faker.string.uuid(),
      email,
      name,
      avatar_url: `https://i.pravatar.cc/150?u=${encodeURIComponent(email)}`,
      org_id: this.org.id,
      token: 'mock-jwt-token-' + faker.string.alphanumeric(24),
    };
    this.recruiter[email] = user;
    return user;
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────
  dashboardStats(): DashboardStats {
    const active = this.roles.filter((r) => r.status === 'active').length;
    const totalC = Object.values(this.candidates).reduce((a, c) => a + c.length, 0);
    return {
      total_roles: this.roles.length,
      active_roles: active,
      total_candidates: totalC,
      hired_this_month: faker.number.int({ min: 3, max: 12 }),
      avg_time_to_hire_days: faker.number.int({ min: 18, max: 45 }),
      pipeline_value: faker.number.int({ min: 500000, max: 2000000 }),
    };
  }

  // ── Roles ──────────────────────────────────────────────────────────────────
  getRoles(): Role[] {
    return [...this.roles];
  }

  getRole(id: string): Role {
    const role = this.roles.find((r) => r.id === id);
    if (!role) throw new Error('Role not found');
    return role;
  }

  createRole(data: Partial<Role>): Role {
    const id = faker.string.uuid();
    const role: Role = {
      id,
      org_id: this.org.id,
      title: data.title ?? 'Untitled Role',
      department: data.department ?? 'Engineering',
      location: data.location ?? 'Remote',
      employment_type: data.employment_type ?? 'Full-time',
      description: data.description ?? '',
      status: 'draft',
      created_at: new Date().toISOString(),
      applicant_count: 0,
      rounds: [],
    };
    this.roles.unshift(role);
    this.candidates[id] = [];
    return role;
  }

  updateRole(id: string, data: Partial<Role>): Role {
    const role = this.getRole(id);
    Object.assign(role, data);
    return role;
  }

  deleteRole(id: string) {
    this.roles = this.roles.filter((r) => r.id !== id);
    delete this.candidates[id];
  }

  // ── Rounds ──────────────────────────────────────────────────────────────────
  updateRounds(roleId: string, roundsData: Partial<Round>[]): Round[] {
    const role = this.getRole(roleId);
    role.rounds = roundsData.map((r, i) => ({
      id: r.id ?? faker.string.uuid(),
      role_id: roleId,
      name: r.name ?? `Round ${i + 1}`,
      type: r.type ?? 'custom',
      order: i,
      input_source: r.input_source ?? 'manual_entry',
      ai_scored: r.ai_scored ?? false,
      cutoff_threshold: r.cutoff_threshold ?? 60,
      mail_template: r.mail_template ?? '',
      created_at: r.created_at ?? new Date().toISOString(),
    }));
    return role.rounds;
  }

  // ── Candidates ───────────────────────────────────────────────────────────────
  getCandidates(
    roleId: string,
    params?: { page?: number; page_size?: number; search?: string; status?: string; sort?: string },
  ): import('./types').PaginatedResponse<Candidate> {
    let list = this.candidates[roleId] ?? [];
    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (c) => c.name.toLowerCase().includes(q) || c.email.includes(q) || c.skills.some((s) => s.toLowerCase().includes(q)),
      );
    }
    if (params?.status && params.status !== 'all') {
      list = list.filter((c) => c.status === params.status);
    }
    if (params?.sort === 'score_desc') list = [...list].sort((a, b) => b.overall_score - a.overall_score);
    if (params?.sort === 'score_asc') list = [...list].sort((a, b) => a.overall_score - b.overall_score);
    if (params?.sort === 'recent') list = [...list].sort((a, b) => new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime());

    const page = params?.page ?? 1;
    const pageSize = params?.page_size ?? 50;
    const start = (page - 1) * pageSize;
    const slice = list.slice(start, start + pageSize);
    return {
      data: slice,
      total: list.length,
      page,
      page_size: pageSize,
      has_more: start + pageSize < list.length,
    };
  }

  getCandidate(id: string): Candidate {
    for (const list of Object.values(this.candidates)) {
      const c = list.find((c) => c.id === id);
      if (c) return c;
    }
    throw new Error('Candidate not found');
  }

  overrideDecision(
    candidateId: string,
    roundId: string,
    newStatus: 'passed' | 'failed',
    reason: string,
  ): RoundResult {
    const candidate = this.getCandidate(candidateId);
    const result = candidate.round_results.find((r) => r.round_id === roundId);
    if (!result) throw new Error('Round result not found');
    result.status = newStatus;
    result.overridden = true;
    result.override_reason = reason;
    result.overridden_by = 'Alex Morgan';
    result.overridden_at = new Date().toISOString();
    return result;
  }

  getAuditLog(candidateId: string): AuditLog[] {
    const candidate = this.getCandidate(candidateId);
    return makeAuditLog(candidateId, candidate);
  }

  getPerformanceReport(candidateId: string): PerformanceReport {
    const candidate = this.getCandidate(candidateId);
    const role = this.getRole(candidate.role_id);
    return makePerformanceReport(candidate, role);
  }

  // ── Bulk upload ─────────────────────────────────────────────────────────────
  addCandidatesFromUpload(roleId: string, count: number) {
    const role = this.getRole(roleId);
    const existing = this.candidates[roleId] ?? [];
    const newOnes = Array.from({ length: count }, (_, i) =>
      makeCandidate(roleId, role.rounds, existing.length + i + 99999),
    );
    this.candidates[roleId] = [...newOnes, ...existing];
    role.applicant_count += count;
  }

  // ── Org ──────────────────────────────────────────────────────────────────────
  getOrg(): Organization {
    return { ...this.org };
  }

  updateOrg(data: Partial<Organization>): Organization {
    Object.assign(this.org, data);
    return { ...this.org };
  }

  getOrgMembers(): OrgMember[] {
    return [...this.members];
  }

  inviteMember(email: string, role: OrgMember['role']): OrgMember {
    const member: OrgMember = {
      id: faker.string.uuid(),
      name: email.split('@')[0],
      email,
      role,
      avatar_url: `https://i.pravatar.cc/150?u=${encodeURIComponent(email)}`,
      last_active: new Date().toISOString(),
    };
    this.members.push(member);
    this.org.seats_used++;
    return member;
  }

  removeMember(id: string) {
    this.members = this.members.filter((m) => m.id !== id);
    this.org.seats_used = Math.max(0, this.org.seats_used - 1);
  }

  // ── Live updates ──────────────────────────────────────────────────────────────
  generateLiveEvents(roleId: string): LiveUpdateEvent[] {
    const list = this.candidates[roleId];
    if (!list || list.length === 0) return [];
    const events: LiveUpdateEvent[] = [];
    const count = faker.number.int({ min: 1, max: 3 });
    for (let i = 0; i < count; i++) {
      const candidate = faker.helpers.arrayElement(list);
      const type = faker.helpers.arrayElement<LiveUpdateEvent['type']>([
        'candidate_status',
        'new_candidate',
        'round_complete',
      ]);
      events.push({
        type,
        payload: {
          candidate_id: candidate.id,
          role_id: roleId,
          status: faker.helpers.arrayElement(['screened', 'tested', 'interviewed'] as CandidateStatus[]),
          message: type === 'new_candidate'
            ? `${faker.person.fullName()} applied`
            : type === 'round_complete'
              ? `${candidate.name} cleared ${faker.helpers.arrayElement(['Resume Screen', 'Aptitude Test'])}`
              : `${candidate.name} moved to ${faker.helpers.arrayElement(['Screening', 'Testing'])}`,
        },
      });
    }
    return events;
  }
}

export const mockData = new MockDataStore();
