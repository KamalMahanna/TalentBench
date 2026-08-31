# TalentBench — Production Python Backend

Production-ready, horizontally scalable backend for **TalentBench**, an AI-powered recruiter platform that screens, benchmarks, and generates personalized feedback for 10,000–20,000 job candidate applications per role.

---

## 🏛️ System Architecture

```
                               ┌────────────────────────┐
                               │  Frontend (Next.js)    │
                               └───────────┬────────────┘
                                           │ HTTP / SSE
                                           ▼
                               ┌────────────────────────┐
                               │  FastAPI Primary API   │
                               │ (asyncpg, Pydantic v2) │
                               └─────┬────────────┬─────┘
                                     │            │
             ┌───────────────────────┘            └────────────────────────┐
             ▼                                                             ▼
┌─────────────────────────┐                                   ┌─────────────────────────┐
│ PostgreSQL 16 + pgvector│                                   │   Redis 7 (Broker &     │
│ (Roles, Candidates,     │                                   │   PubSub & LLM Cache)   │
│  AuditLogs, JobStatus)  │                                   └────────────┬────────────┘
└─────────────────────────┘                                                │
                                    ┌──────────────────────────────────────┼──────────────────────────────────────┐
                                    ▼                                      ▼                                      ▼
                         ┌──────────────────────┐              ┌──────────────────────┐              ┌──────────────────────┐
                         │ Celery Worker: Resume│              │ Celery Worker: Scoring│             │ Celery Worker: Mail  │
                         │ (Ingestion & Embed)  │              │ (Rubric & Webhooks)  │              │ (Jinja2 + LLM & DLQ) │
                         └──────────┬───────────┘              └──────────┬───────────┘              └──────────┬───────────┘
                                    │                                     │                                     │
                                    └─────────────────────────────────────┴─────────────────────────────────────┘
                                                                          │
                                                                          ▼
                                                              ┌──────────────────────┐
                                                              │  LLM Gateway & S3    │
                                                              │ (Cache + AuditLog)   │
                                                              └──────────────────────┘
```

---

## 🚀 Key Highlights & Scale Design (10k–20k Applications / Role)

1. **Dashboard Unaffected by Ingestion Spikes**:
   - Ingestion, resume parsing, pgvector embedding, rubric evaluation, and mail dispatch are executed asynchronously by dedicated Celery workers in separate isolated containers (`worker-resume`, `worker-scoring`, `worker-mail`).
   - The FastAPI API server handles dashboard requests with sub-10ms response times.
2. **Crash-Safe Checkpointing & Idempotency**:
   - Batch jobs track progress per candidate in the `job_statuses` table with deterministic idempotency keys (`{batch_id}:{candidate_id}:{step}`).
   - If a worker terminates mid-batch, it resumes without double-scoring candidates or re-sending emails.
3. **Dead-Letter Queue (DLQ) & Recruiter Attention**:
   - Permanent failures (after 3 exponential backoff retries with jitter) move to `dead_letter` status and surface in the recruiter's `GET /api/v1/roles/{role_id}/attention-needed` queue with one-click retry.
4. **Token-Bounded LLM Map-Reduce & Circularity Prevention**:
   - `BenchmarkProfile` reference standards are derived from JD requirements or historical hired cohorts — **never** derived from the active applicant batch.
   - Project extraction runs a token-bounded map-reduce reducer over reference projects.
5. **Cost-Efficient Mail Generation**:
   - Full emails are templated via Jinja2; the LLM is only prompted to generate the concise, personalized 1–2 sentence gap summary or praise section.
6. **Auditability & Explainability**:
   - Every AI evaluation writes an immutable `AuditLog` row capturing prompt version, input snapshot, raw model output, and verdict **before** any mail or transition action fires.

---

## ⚡ Quickstart

### Prerequisites
- Docker & Docker Compose (or Python 3.12+, PostgreSQL 16 with pgvector, Redis 7)

### 1. Launch with Docker Compose
```bash
cd backend
cp .env.example .env

# Start API, Workers, PostgreSQL, Redis, MinIO, Prometheus, Grafana, Flower
docker compose up -d --build
```

### 2. Run Database Migrations
```bash
docker compose exec api alembic upgrade head
```

### 3. Seed Realistic Recruiter Data
```bash
docker compose exec api python scripts/seed.py
```

### 4. Access Services
- **API Swagger / OpenAPI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)
- **Metrics (Prometheus format)**: [http://localhost:8000/metrics](http://localhost:8000/metrics)
- **Flower (Celery Monitor)**: [http://localhost:5555](http://localhost:5555)
- **MinIO Storage Console**: [http://localhost:9001](http://localhost:9001) (`minioadmin` / `minioadmin`)
- **Grafana Dashboards**: [http://localhost:3001](http://localhost:3001) (`admin` / `admin`)

---

## 🧪 Testing

The backend includes a comprehensive unit, integration, and contract test suite.

```bash
# Run full test suite with coverage
pytest -v --cov=app

# Run contract tests validating API against frontend TypeScript types
pytest tests/contract/test_openapi_contract.py -v
```

---

## 🔌 Frontend Contract Compatibility

The API contract strictly adheres to the TypeScript types defined in [`lib/types.ts`](../lib/types.ts) and the API calls in [`lib/api-client.ts`](../lib/api-client.ts):

| Frontend Client Method | HTTP Route | Response Type |
| :--- | :--- | :--- |
| `api.login(email, password)` | `POST /api/v1/auth/login` | `ApiResponse<AuthUser>` |
| `api.signup(email, name, orgName)` | `POST /api/v1/auth/signup` | `ApiResponse<AuthUser>` |
| `api.getDashboardStats()` | `GET /api/v1/dashboard/stats` | `ApiResponse<DashboardStats>` |
| `api.getRoles()` | `GET /api/v1/roles` | `ApiResponse<Role[]>` |
| `api.getRole(id)` | `GET /api/v1/roles/{id}` | `ApiResponse<Role>` |
| `api.createRole(data)` | `POST /api/v1/roles` | `ApiResponse<Role>` |
| `api.updateRole(id, data)` | `PUT /api/v1/roles/{id}` | `ApiResponse<Role>` |
| `api.deleteRole(id)` | `DELETE /api/v1/roles/{id}` | `ApiResponse<{ id: string }>` |
| `api.updateRounds(roleId, rounds)` | `PUT /api/v1/roles/{roleId}/rounds` | `ApiResponse<Round[]>` |
| `api.getCandidates(roleId, params)` | `GET /api/v1/roles/{roleId}/candidates` | `PaginatedResponse<Candidate>` |
| `api.getCandidate(id)` | `GET /api/v1/candidates/{id}` | `ApiResponse<Candidate>` |
| `api.overrideDecision(candId, roundId, status, reason)` | `POST /api/v1/candidates/{candId}/override` | `ApiResponse<RoundResult>` |
| `api.getAuditLog(candId)` | `GET /api/v1/candidates/{candId}/audit-log` | `ApiResponse<AuditLog[]>` |
| `api.getPerformanceReport(candId)` | `GET /api/v1/candidates/{candId}/performance-report` | `ApiResponse<PerformanceReport>` |
| `api.bulkUpload(roleId, files)` | `POST /api/v1/roles/{roleId}/upload` | `ApiResponse<{ uploaded, failed }>` |
| `api.getOrg()` | `GET /api/v1/org` | `ApiResponse<Organization>` |
| `api.getOrgMembers()` | `GET /api/v1/org/members` | `ApiResponse<OrgMember[]>` |
| `api.inviteMember(email, role)` | `POST /api/v1/org/members` | `ApiResponse<OrgMember>` |
| `api.removeMember(id)` | `DELETE /api/v1/org/members/{id}` | `ApiResponse<{ id: string }>` |
| `subscribeToLiveUpdates(roleId, onEvent)` | `GET /api/v1/roles/{roleId}/events` | SSE Stream (`LiveUpdateEvent`) |

> Both `/api/v1/...` and `/api/...` prefixes are mounted in FastAPI so any frontend base URL configuration works seamlessly without friction.

---

## 🔒 Security & Data Compliance

- **Authentication**: JWT Bearer token authentication with SHA-256 / HS-256 tokens and pure `bcrypt` salt generation.
- **RBAC**: Multi-role support (`admin`, `recruiter`, `viewer`).
- **Data Compliance**: `consent_on_file` tracking on all candidate records with automated retention query helpers.
- **Rate Limiting**: Sliding window counters backed by Redis (`1200 req/min` per org, `30 req/min` for uploads).

---

## 💾 Backup & Disaster Recovery

- **RPO Target**: **1 Hour** (Automated daily snapshots + continuous WAL archiving).
- **RTO Target**: **30 Minutes**.

### Executing Backups
```bash
# Triggers compressed pg_dump with SHA256 verification and optional S3 sync
./scripts/backup.sh
```

### Executing Recovery
```bash
# Restores from compressed archive
./scripts/restore.sh /tmp/talentbench_backups/talentbench_YYYYMMDD_HHMMSSZ.dump.gz
```

