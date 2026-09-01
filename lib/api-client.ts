import type {
  ApiResponse,
  AuthUser,
  AuditLog,
  Candidate,
  DashboardStats,
  LiveUpdateEvent,
  Organization,
  PaginatedResponse,
  PerformanceReport,
  Role,
  Round,
  OrgMember,
} from './types';
import { mockData } from './mock-data';

// ── TalentBench API client ───────────────────────────────────────────────────
// Single abstraction layer for every backend call. The backend team swaps the
// implementation of these functions; components never call fetch directly.

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api';
const AUTH_STRATEGY: 'cookie' | 'bearer' =
  (process.env.NEXT_PUBLIC_AUTH_STRATEGY as 'cookie' | 'bearer') ?? 'bearer';

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

function authHeaders(): Record<string, string> {
  if (AUTH_STRATEGY === 'bearer' && authToken) {
    return { Authorization: `Bearer ${authToken}` };
  }
  return {};
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

// Simulate network latency for mock data
function delay<T>(value: T, ms = 300): Promise<T> {
  return new Promise((r) => setTimeout(() => r(value), ms));
}

// ── Auth ────────────────────────────────────────────────────────────────────
export const api = {
  async login(email: string, _password: string): Promise<ApiResponse<AuthUser>> {
    const user = mockData.getRecruiter(email);
    setAuthToken(user.token);
    return delay({ data: user });
  },

  async signup(
    email: string,
    name: string,
    orgName: string,
  ): Promise<ApiResponse<AuthUser>> {
    const user = mockData.createRecruiter(email, name, orgName);
    setAuthToken(user.token);
    return delay({ data: user });
  },

  // ── Dashboard ──────────────────────────────────────────────────────────────
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    return delay({ data: mockData.dashboardStats() });
  },

  async getRoles(): Promise<ApiResponse<Role[]>> {
    return delay({ data: mockData.getRoles() });
  },

  async getRole(id: string): Promise<ApiResponse<Role>> {
    return delay({ data: mockData.getRole(id) });
  },

  async createRole(
    data: Partial<Role>,
  ): Promise<ApiResponse<Role>> {
    return delay({ data: mockData.createRole(data) }, 500);
  },

  async updateRole(
    id: string,
    data: Partial<Role>,
  ): Promise<ApiResponse<Role>> {
    return delay({ data: mockData.updateRole(id, data) });
  },

  async deleteRole(id: string): Promise<ApiResponse<{ id: string }>> {
    mockData.deleteRole(id);
    return delay({ data: { id } });
  },

  async uploadJobDescription(
    roleId: string,
    file: File,
  ): Promise<ApiResponse<Role>> {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_BASE_URL}/roles/${roleId}/upload-jd`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      });
      if (res.ok) return (await res.json()) as ApiResponse<Role>;
    } catch {
      // fallback to mock
    }
    return delay({
      data: mockData.updateRole(roleId, {
        description: `Uploaded Job Description (${file.name})`,
      }),
    });
  },

  async parseJobDescription(
    file: File,
  ): Promise<ApiResponse<{ filename: string; text: string; suggested_title?: string }>> {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_BASE_URL}/roles/parse-jd`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      });
      if (res.ok) {
        return (await res.json()) as ApiResponse<{ filename: string; text: string; suggested_title?: string }>;
      }
    } catch {
      // fallback
    }

    if (file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      const text = await file.text();
      return {
        data: {
          filename: file.name,
          text,
          suggested_title: text.split('\n')[0].replace(/^#+\s*/, '').trim(),
        },
      };
    }

    return {
      data: {
        filename: file.name,
        text: `Job requirements for ${file.name.replace(/\.[^/.]+$/, '')}`,
        suggested_title: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
      },
    };
  },

  async polishJobDescription(
    text: string,
  ): Promise<
    ApiResponse<{
      polished_text: string;
      original_char_count: number;
      polished_char_count: number;
      tokens_saved_estimate: number;
    }>
  > {
    try {
      const res = await fetch(`${API_BASE_URL}/roles/polish-jd`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        return (await res.json()) as ApiResponse<{
          polished_text: string;
          original_char_count: number;
          polished_char_count: number;
          tokens_saved_estimate: number;
        }>;
      }
      const errData = await res.json().catch(() => null);
      throw new Error(errData?.detail || 'Failed to polish job description');
    } catch (err) {
      console.warn('Backend polish-jd request error:', err);
    }

    const lines = text.split('\n').filter((l) => {
      const lower = l.toLowerCase();
      return (
        !lower.includes('about us') &&
        !lower.includes('benefits') &&
        !lower.includes('perks') &&
        !lower.includes('equal opportunity')
      );
    });
    const polished = lines.join('\n').trim() || text;
    return {
      data: {
        polished_text: polished,
        original_char_count: text.length,
        polished_char_count: polished.length,
        tokens_saved_estimate: Math.max(0, Math.floor((text.length - polished.length) / 4)),
      },
    };
  },

  // ── Pipeline / Rounds ──────────────────────────────────────────────────────
  async updateRounds(
    roleId: string,
    rounds: Partial<Round>[],
  ): Promise<ApiResponse<Round[]>> {
    try {
      const res = await fetch(`${API_BASE_URL}/roles/${roleId}/rounds`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(rounds),
      });
      if (res.ok) {
        const json = (await res.json()) as ApiResponse<Round[]>;
        mockData.updateRounds(roleId, rounds);
        return json;
      }
    } catch {
      // fallback
    }
    return delay({ data: mockData.updateRounds(roleId, rounds) }, 400);
  },

  async downloadResumesExcel(roleId: string, roleTitle = 'Role'): Promise<void> {
    try {
      const url = `${API_BASE_URL}/roles/${roleId}/export-resumes-excel`;
      const res = await fetch(url, { headers: authHeaders() });
      if (res.ok) {
        const blob = await res.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `${roleTitle.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_')}_resumes_extracted.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
        return;
      }
    } catch (err) {
      console.warn('Backend excel export error:', err);
    }
    // Fallback: create CSV from mock data if running offline
    const candidates = mockData.getCandidates(roleId).data;
    const header = ['Candidate ID', 'Name', 'Email ID', 'Status', 'Score', 'Skills', 'Extracted Resume Text'];
    const rows = candidates.map((c) => [
      c.id,
      `"${c.name}"`,
      `"${c.email}"`,
      c.status === 'screened' ? 'Shortlisted' : c.status === 'rejected' ? 'Rejected' : c.status,
      c.overall_score,
      `"${(c.skills || []).join(', ')}"`,
      `"${(c.resume_text || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `${roleTitle.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_')}_resumes_extracted.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },

  async runComparativeMatching(roleId: string): Promise<ApiResponse<{ task_id: string; message: string }>> {
    try {
      const res = await fetch(`${API_BASE_URL}/roles/${roleId}/run-comparative-matching`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (res.ok) {
        return (await res.json()) as ApiResponse<{ task_id: string; message: string }>;
      }
    } catch (err) {
      console.warn('Backend runComparativeMatching error:', err);
    }
    return delay(
      {
        data: {
          task_id: 'mock-comp-task-1',
          message: 'Comparative Resume Matching started in background.',
        },
      },
      800,
    );
  },

  async getComparativeBenchmark(
    roleId: string,
  ): Promise<ApiResponse<{ role_id: string; top_projects: any[]; cutoff_count: number; has_benchmark: boolean }>> {
    try {
      const res = await fetch(`${API_BASE_URL}/roles/${roleId}/comparative-benchmark`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        return (await res.json()) as ApiResponse<{
          role_id: string;
          top_projects: any[];
          cutoff_count: number;
          has_benchmark: boolean;
        }>;
      }
    } catch (err) {
      console.warn('Backend getComparativeBenchmark error:', err);
    }
    return delay(
      {
        data: {
          role_id: roleId,
          top_projects: [
            {
              id: 'bench-1',
              title: 'Distributed Multi-Region Event Ingestion Platform',
              description: 'High-throughput Kafka and Go pipeline processing 500k events/sec with sub-50ms p99 latency.',
              technologies: ['Go', 'Kafka', 'Kubernetes', 'PostgreSQL'],
              complexity_score: 10,
            },
            {
              id: 'bench-2',
              title: 'Real-Time Transaction Ledger & Double-Entry Consensus',
              description: 'Financial ledger utilizing Redis distributed locks and transactional outbox pattern.',
              technologies: ['Python', 'FastAPI', 'Redis', 'PostgreSQL'],
              complexity_score: 9,
            },
            {
              id: 'bench-3',
              title: 'Low-Latency Global Distributed Cache Layer',
              description: 'Distributed in-memory caching system with consistent hashing and LRU-K eviction.',
              technologies: ['Rust', 'Redis', 'gRPC', 'AWS'],
              complexity_score: 9,
            },
          ],
          cutoff_count: 300,
          has_benchmark: true,
        },
      },
      400,
    );
  },

  // ── Candidates ─────────────────────────────────────────────────────────────
  async getCandidates(
    roleId: string,
    params?: {
      page?: number;
      page_size?: number;
      search?: string;
      status?: string;
      sort?: string;
    },
  ): Promise<PaginatedResponse<Candidate>> {
    return delay(mockData.getCandidates(roleId, params));
  },

  async getCandidate(id: string): Promise<ApiResponse<Candidate>> {
    return delay({ data: mockData.getCandidate(id) });
  },

  async overrideDecision(
    candidateId: string,
    roundId: string,
    newStatus: 'passed' | 'failed',
    reason: string,
  ): Promise<ApiResponse<RoundResult>> {
    return delay(
      { data: mockData.overrideDecision(candidateId, roundId, newStatus, reason) },
      500,
    );
  },

  async getAuditLog(candidateId: string): Promise<ApiResponse<AuditLog[]>> {
    return delay({ data: mockData.getAuditLog(candidateId) });
  },

  // ── Performance report ────────────────────────────────────────────────────
  async getPerformanceReport(
    candidateId: string,
  ): Promise<ApiResponse<PerformanceReport>> {
    return delay({ data: mockData.getPerformanceReport(candidateId) }, 500);
  },

  // ── Bulk upload ────────────────────────────────────────────────────────────
  async bulkUpload(
    roleId: string,
    files: { name: string; size: number }[],
    onProgress?: (file: string, progress: number, status: 'processing' | 'done' | 'error') => void,
  ): Promise<ApiResponse<{ uploaded: number; failed: number }>> {
    let uploaded = 0;
    let failed = 0;
    for (const file of files) {
      onProgress?.(file.name, 0, 'processing');
      await new Promise((r) => setTimeout(r, 200));
      for (let p = 0; p <= 100; p += 10) {
        onProgress?.(file.name, p, 'processing');
        await new Promise((r) => setTimeout(r, 60));
      }
      const isError = Math.random() < 0.08;
      if (isError) {
        failed++;
        onProgress?.(file.name, 100, 'error');
      } else {
        uploaded++;
        onProgress?.(file.name, 100, 'done');
      }
    }
    mockData.addCandidatesFromUpload(roleId, uploaded);
    return delay({ data: { uploaded, failed } }, 200);
  },

  // ── Organization ───────────────────────────────────────────────────────────
  async getOrg(): Promise<ApiResponse<Organization>> {
    return delay({ data: mockData.getOrg() });
  },

  async getOrgMembers(): Promise<ApiResponse<OrgMember[]>> {
    return delay({ data: mockData.getOrgMembers() });
  },

  async updateOrg(data: Partial<Organization>): Promise<ApiResponse<Organization>> {
    return delay({ data: mockData.updateOrg(data) });
  },

  async inviteMember(
    email: string,
    role: OrgMember['role'],
  ): Promise<ApiResponse<OrgMember>> {
    return delay({ data: mockData.inviteMember(email, role) }, 500);
  },

  async removeMember(id: string): Promise<ApiResponse<{ id: string }>> {
    mockData.removeMember(id);
    return delay({ data: { id } });
  },
};

// Re-export RoundResult type for the override function return
import type { RoundResult } from './types';

// ── Live updates (SSE abstraction) ──────────────────────────────────────────
export function subscribeToLiveUpdates(
  roleId: string,
  onEvent: (event: LiveUpdateEvent) => void,
  onError?: () => void,
): () => void {
  let active = true;
  let interval: ReturnType<typeof setInterval> | null = null;

  function startPolling() {
    interval = setInterval(() => {
      if (!active) return;
      const events = mockData.generateLiveEvents(roleId);
      events.forEach(onEvent);
    }, 4000);
  }

  // Simulate initial SSE connection attempt then fallback to polling
  setTimeout(() => {
    if (!active) return;
    onError?.();
    startPolling();
  }, 800);

  return () => {
    active = false;
    if (interval) clearInterval(interval);
  };
}
