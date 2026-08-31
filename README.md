# TalentBench — AI-Powered Recruiter Screening & Benchmarking Platform

[![Python](https://img.shields.io/badge/Python-3.13-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-13+-black.svg)](https://nextjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%20+%20pgvector-336791.svg)](https://github.com/pgvector/pgvector)
[![Redis](https://img.shields.io/badge/Redis-7-red.svg)](https://redis.io)
[![LangChain Groq](https://img.shields.io/badge/LangChain-Groq%20(Qwen%2027B)-orange.svg)](https://groq.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**TalentBench** is an enterprise-grade AI recruitment platform built to benchmark, screen, and generate personalized feedback for **10,000–20,000 job applications per role** without timing out, losing state on worker failures, or degrading recruiter dashboard responsiveness.

---

## 📑 Table of Contents

- [Overview & Architecture](#-overview--architecture)
- [Core Features & Scale Design](#-core-features--scale-design)
- [Tech Stack](#-tech-stack)
- [Local Setup & Running](#-local-setup--running)
  - [Option A: One-Command Full Stack (Docker Compose)](#option-a-one-command-full-stack-docker-compose)
  - [Option B: Manual Development Setup](#option-b-manual-development-setup)
- [Running Tests](#-running-tests)
- [Cloud Setup & Production Deployment](#-cloud-setup--production-deployment)
  - [1. Cloud Infrastructure Overview](#1-cloud-infrastructure-overview)
  - [2. Environment Variables & Secrets](#2-environment-variables--secrets)
  - [3. Worker Autoscaling Strategy](#3-worker-autoscaling-strategy)
  - [4. Backup & Disaster Recovery](#4-backup--disaster-recovery)
  - [5. Observability & Monitoring](#5-observability--monitoring)
- [API Contract Parity](#-api-contract-parity)
- [License](#-license)

---

## 🏛️ Overview & Architecture

TalentBench solves high-volume applicant screening with an asynchronous, queue-driven pipeline that decouples compute-intensive parsing and evaluation from interactive recruiter UI operations:

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
   │ PostgreSQL 16 + pgvector│                                   │   Redis 7 (Broker,      │
   │ (Roles, Candidates,     │                                   │   PubSub & Rate Limiter)│
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
                                                                 │   LangChain Groq     │
                                                                 │  (qwen/qwen3.8-27b)  │
                                                                 │ (Proactive Limiter)  │
                                                                 └──────────────────────┘
```

---

## 🌟 Core Features & Scale Design

1. **Horizontal Scale (10k–20k Applications / Role)**:
   - High-throughput asynchronous batch processing powered by partitioned Celery workers.
   - Recruiter dashboard requests execute sub-10ms queries against indexed PostgreSQL tables without waiting on worker queues.
2. **Objective Anti-Circularity Benchmarking**:
   - Baseline benchmarks (`BenchmarkProfile`) are derived exclusively from Job Description requirements or historical hired cohorts — never computed from the current applicant batch to avoid circular grading standards.
3. **Deterministic Checkpointing & Idempotency**:
   - Pipeline checkpoints stored in the `job_statuses` table with unique idempotency keys (`{batch_id}:{candidate_id}:{step}`).
   - If workers restart, processing automatically resumes without re-evaluating candidates or duplicate emailing.
4. **Dead-Letter Queue (DLQ) & Recruiter Attention Queue**:
   - Permanent failures (after 5 retries with exponential backoff & jitter) transition to `dead_letter` status and surface in the recruiter's `/attention-needed` dashboard with single-click manual retry.
5. **Explainable AI Audit Trail**:
   - Every AI verdict writes an immutable `AuditLog` row capturing model snapshot, prompt ID, and raw reasoning *before* triggering status changes or candidate emails.
6. **Proactive Rate Limiting & Auto-Retry for LLMs**:
   - Built-in token bucket and sliding window rate limiter for LangChain Groq (`qwen/qwen3.8-27b`):
     - **30 requests / minute**, **1,000 requests / day**
     - **8,000 tokens / minute**, **200,000 tokens / day**
   - Automatically handles 429 HTTP responses with `Retry-After` header parsing, exponential backoff, and jitter.
7. **Cost-Efficient Mail Generation**:
   - Email templates rendered with Jinja2; the LLM is only called to generate the concise, candidate-specific constructive feedback snippet.
8. **Real-Time Live Updates**:
   - Server-Sent Events (SSE) streaming candidate status and ingestion progress in real-time.

---

## 🧰 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Next.js 13+ (App Router), TypeScript, Tailwind CSS, Radix UI, Lucide Icons, React Query |
| **Backend API** | Python 3.12, FastAPI, Pydantic v2, Uvicorn, SQLAlchemy 2.0 (AsyncIO), Alembic |
| **Workers & Queues** | Celery, Redis 7, Flower |
| **Database & Search** | PostgreSQL 16 with `pgvector` extension for 1536-dim semantic embeddings |
| **LLM & AI** | LangChain Groq (`qwen/qwen3.8-27b`), Mock LLM Provider, Redis Semantic Caching |
| **Document Parsing** | `pypdf`, `python-docx`, `openpyxl`, `pandas` |
| **Storage** | MinIO (local) / AWS S3 / Google Cloud Storage |
| **Observability** | Prometheus (`/metrics`), Grafana, OpenTelemetry, `structlog` |

---

## 💻 Local Setup & Running

### Option A: One-Command Full Stack (Docker Compose)

The easiest way to start all services (Frontend, API, 3 Workers, PostgreSQL + pgvector, Redis, MinIO, Flower, Prometheus, Grafana) is via Docker Compose:

#### 1. Clone & Configure Environment
```bash
git clone https://github.com/your-org/talentbench.git
cd talentbench

# Configure backend environment
cp backend/.env.example backend/.env
```

#### 2. Start the Stack
```bash
docker compose up -d --build
```

#### 3. Run Migrations & Seed Sample Data
```bash
# Run database migrations
docker compose exec api alembic upgrade head

# Seed realistic demo recruiter data (roles, candidates, benchmarks, audit logs)
docker compose exec api python scripts/seed.py
```

#### 4. Access Local Services
| Service | URL | Default Credentials |
| :--- | :--- | :--- |
| **Web Dashboard** | [http://localhost:3000](http://localhost:3000) | — |
| **API Documentation** | [http://localhost:8000/docs](http://localhost:8000/docs) | — |
| **Flower (Celery Monitor)** | [http://localhost:5555](http://localhost:5555) | — |
| **MinIO Storage Console** | [http://localhost:9001](http://localhost:9001) | `minioadmin` / `minioadmin` |
| **Grafana Dashboards** | [http://localhost:3001](http://localhost:3001) | `admin` / `admin` |
| **Prometheus Metrics** | [http://localhost:9090](http://localhost:9090) | — |

---

### Option B: Manual Development Setup

If you prefer running services directly on your host machine:

#### Prerequisites
- Node.js 18+ & npm
- Python 3.13+ with `uv` (or `venv`)
- PostgreSQL 16 (with `pgvector` extension)
- Redis 7

#### 1. Start Frontend
```bash
npm install
npm run dev
# Frontend runs on http://localhost:3000
```

#### 2. Start Backend API
```bash
cd backend

# Create virtual environment and install with uv
uv venv --python 3.13
source .venv/bin/activate
uv pip install -e .

# Run migrations & seed data
alembic upgrade head
python scripts/seed.py

# Start FastAPI server with live reload
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 3. Start Celery Workers
In separate terminal tabs (with `.venv` activated):

```bash
# Terminal 1: Resume screening worker (concurrency 8)
celery -A app.workers.celery_app worker --loglevel=info -Q resume_queue -c 8

# Terminal 2: Scoring worker
celery -A app.workers.celery_app worker --loglevel=info -Q scoring_queue,benchmark_queue -c 4

# Terminal 3: Mail dispatch & DLQ worker (concurrency 16)
celery -A app.workers.celery_app worker --loglevel=info -Q mail_queue,dlq_queue -c 16
```

---

## 🧪 Running Tests

The backend includes comprehensive test coverage:
- **Contract Tests**: Asserts 100% schema parity against frontend TypeScript types.
- **Integration Tests**: End-to-end recruiter flows (auth, role creation, candidate upload, decision overrides, audit logs).
- **Unit Tests**: Proactive Groq rate limiter, 429 auto-retry, token calculations, resume parsing, and embeddings.

```bash
cd backend

# Run all tests with coverage report
pytest -v --cov=app

# Run contract tests only
pytest tests/contract/test_openapi_contract.py -v

# Run Groq rate limiter unit tests
pytest tests/unit/test_groq_provider.py -v
```

---

## ☁️ Cloud Setup & Production Deployment

### 1. Cloud Infrastructure Overview

For production deployments (AWS, GCP, Azure, or Kubernetes), deploy following this architecture:

```
[ Internet / Cloudflare CDN ]
              │
              ▼
[ Application Load Balancer / Ingress Controller ]
        ├── /api/*   ──────► [ FastAPI Cluster (EKS / ECS / Cloud Run) ]
        └── /*       ──────► [ Next.js Frontend (Vercel / CloudFront / ECS) ]
                                    │
    ┌───────────────────────────────┴───────────────────────────────┐
    │                                                               │
    ▼                                                               ▼
[ AWS Aurora PostgreSQL / GCP Cloud SQL ]          [ AWS ElastiCache Redis / GCP Memorystore ]
  - pgvector enabled                                 - Cluster mode enabled
  - Read-replicas for recruiter queries              - Celery broker & Rate limiting
    │                                                               │
    └───────────────────────────────┬───────────────────────────────┘
                                    │
                                    ▼
                 [ Celery Worker Pool (Autoscaled Pods) ]
                   - worker-resume: 2-20 replicas (HPA on queue depth)
                   - worker-scoring: 2-10 replicas
                   - worker-mail: 2-10 replicas
                                    │
                                    ▼
                 [ Cloud Storage & External AI ]
                   - S3 / GCS (Resume bucket, Export bucket)
                   - Groq Cloud API (qwen/qwen3.8-27b)
```

---

### 2. Environment Variables & Secrets

Configure the following environment variables in your Kubernetes Secrets or AWS Parameter Store:

```env
# Core Application
ENVIRONMENT=production
DEBUG=false
SECRET_KEY=<generate-secure-random-256-bit-key>
API_V1_STR=/api/v1
CORS_ORIGINS=["https://talentbench.yourcompany.com"]

# Managed Database (PostgreSQL 16 + pgvector)
POSTGRES_USER=app_talentbench
POSTGRES_PASSWORD=<strong-database-password>
POSTGRES_HOST=db.prod.talentbench.internal
POSTGRES_PORT=5432
POSTGRES_DB=talentbench

# Managed Redis (ElastiCache / Memorystore)
REDIS_HOST=redis.prod.talentbench.internal
REDIS_PORT=6379
REDIS_PASSWORD=<redis-auth-token>

# Cloud Object Storage (AWS S3)
S3_ENDPOINT_URL=https://s3.us-east-1.amazonaws.com
S3_ACCESS_KEY=<aws-iam-access-key>
S3_SECRET_KEY=<aws-iam-secret-key>
S3_BUCKET_RESUMES=prod-talentbench-resumes
S3_BUCKET_EXPORTS=prod-talentbench-exports
S3_REGION=us-east-1
S3_USE_SSL=true

# AI Engine — LangChain Groq
LLM_PROVIDER=groq
GROQ_API_KEY=gsk_...
GROQ_MODEL=qwen/qwen3.8-27b
GROQ_RPM_LIMIT=30
GROQ_RPD_LIMIT=1000
GROQ_TPM_LIMIT=8000
GROQ_TPD_LIMIT=200000
GROQ_MAX_RETRIES=5

# SMTP Email Service (e.g., SendGrid, AWS SES)
MAIL_PROVIDER=smtp
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=<sendgrid-api-key>
FROM_EMAIL=recruiting@yourcompany.com
FROM_NAME="TalentBench Recruiting"
```

---

### 3. Worker Autoscaling Strategy

To handle high-volume batch ingestion (e.g. 20,000 resumes uploaded in a single ZIP/CSV):

1. **Horizontal Pod Autoscaling (HPA)**:
   - Scale Celery workers based on Prometheus queue metrics exposed at `/metrics`:
     - `talentbench_celery_queue_depth{queue="resume_queue"}`
     - `talentbench_celery_queue_depth{queue="mail_queue"}`
2. **Target Metrics**:
   - Scale up when queue depth > 100 messages per worker replica.
   - Minimum replicas: 2 (for redundancy), Maximum replicas: 25.

---

### 4. Backup & Disaster Recovery

- **Recovery Point Objective (RPO)**: **1 Hour**
- **Recovery Time Objective (RTO)**: **30 Minutes**

Automated scripts are included in `backend/scripts/`:

```bash
# 1. Run automated compressed backup with SHA-256 verification and cloud sync:
./backend/scripts/backup.sh

# 2. Restore database in disaster scenario:
./backend/scripts/restore.sh /path/to/talentbench_backup.dump.gz
```

---

### 5. Observability & Monitoring

1. **Prometheus Metrics**: Available at `/metrics`:
   - Endpoint request latencies & status codes
   - Celery active tasks, completed tasks, and queue depth
   - Dead-Letter Queue (DLQ) task counts
2. **OpenTelemetry Tracing**: Distributed tracing across FastAPI endpoints and database transactions.
3. **Structured Logs**: JSON logs emitted via `structlog` for ingestion into Datadog, CloudWatch, or ELK.

---

## 🔌 API Contract Parity

All endpoints strictly adhere to the frontend TypeScript interfaces in [`lib/types.ts`](lib/types.ts):

| HTTP Route | Method | Description |
| :--- | :--- | :--- |
| `/api/v1/auth/login` | `POST` | Authenticate recruiter and issue JWT |
| `/api/v1/dashboard/stats` | `GET` | Retrieve pipeline KPIs & candidate totals |
| `/api/v1/roles` | `GET`, `POST` | List and create recruitment roles |
| `/api/v1/roles/{id}/rounds` | `PUT` | Configure multi-round screening stages |
| `/api/v1/roles/{id}/candidates` | `GET` | Paginated, filtered candidate search |
| `/api/v1/roles/{id}/upload` | `POST` | Bulk resume upload (PDF, DOCX, CSV, Excel) |
| `/api/v1/candidates/{id}/override` | `POST` | Recruiter manual override with audit snapshot |
| `/api/v1/candidates/{id}/audit-log` | `GET` | Immutable AI evaluation decision log |
| `/api/v1/roles/{id}/events` | `GET` | Server-Sent Events (SSE) live stream |
| `/api/v1/roles/{id}/attention-needed` | `GET` | Dead-letter queue failed jobs for recruiter review |
| `/api/v1/jobs/{id}/retry` | `POST` | Retry dead-lettered candidate job |

---

## 📄 License

This project is licensed under the MIT License.

