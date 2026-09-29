# TalentBench Backend Architecture & Code Reference (`backend.md`)

This document provides a comprehensive, file-by-file and function-by-function architectural breakdown of the **TalentBench Python Backend**.

For every file in the backend repository, this reference explains:
1. **File Purpose**: What the file does and its role in the overall system.
2. **Functions & Methods**: For every function/method:
   - **What it does**: Exact technical operation, parameters, and return types.
   - **Why it is used**: Architectural rationale, design decisions, and requirements fulfilled.
   - **How it works / How it will be used**: Execution mechanics, internal logic, concurrency, and error handling.
   - **Where it is used**: Callers, endpoint routes, background workers, or consumers.

---

## Table of Contents

1. [Application Core & Configuration](#1-application-core--configuration)
   - [`backend/app/main.py`](#backendappmainpy)
   - [`backend/app/config.py`](#backendappconfigpy)
   - [`backend/app/database.py`](#backendappdatabasepy)
2. [Data Models (`backend/app/models/`)](#2-data-models-backendappmodels)
   - [`base.py`](#basepy)
   - [`organization.py`](#organizationpy)
   - [`user.py`](#userpy)
   - [`role.py`](#rolepy)
   - [`round.py`](#roundpy)
   - [`candidate.py`](#candidatepy)
   - [`round_result.py`](#round_resultpy)
   - [`benchmark_profile.py`](#benchmark_profilepy)
   - [`audit_log.py`](#audit_logpy)
   - [`job_status.py`](#job_statuspy)
   - [`mail_queue.py`](#mail_queuepy)
3. [Pydantic Schemas (`backend/app/schemas/`)](#3-pydantic-schemas-backendappschemas)
   - [`common.py`](#commonpy)
   - [`domain.py`](#domainpy)
4. [Middleware & Security (`backend/app/middleware/`)](#4-middleware--security-backendappmiddleware)
   - [`auth.py`](#authpy)
   - [`rate_limit.py`](#rate_limitpy)
5. [API Routes (`backend/app/api/`)](#5-api-routes-backendappapi)
   - [`router.py`](#routerpy)
   - [`v1/auth.py`](#v1authpy)
   - [`v1/dashboard.py`](#v1dashboardpy)
   - [`v1/roles.py`](#v1rolespy)
   - [`v1/candidates.py`](#v1candidatespy)
   - [`v1/decisions.py`](#v1decisionspy)
   - [`v1/audit.py`](#v1auditpy)
   - [`v1/reports.py`](#v1reportspy)
   - [`v1/upload.py`](#v1uploadpy)
   - [`v1/org.py`](#v1orgpy)
   - [`v1/events.py`](#v1eventspy)
   - [`v1/benchmark.py`](#v1benchmarkpy)
   - [`v1/attention.py`](#v1attentionpy)
6. [LLM Engine & Providers (`backend/app/llm/`)](#6-llm-engine--providers-backendappllm)
   - [`gateway.py`](#gatewaypy)
   - [`cache.py`](#cachepy)
   - [`rate_limiter.py`](#rate_limiterpy)
   - [`providers/gemini_provider.py`](#providersgemini_providerpy)
   - [`providers/groq_provider.py`](#providersgroq_providerpy)
   - [`providers/mock.py`](#providersmockpy)
   - [`__init__.py`](#llm__init__py)
7. [Parsing & Vector Scoring (`backend/app/parsing/`)](#7-parsing--vector-scoring-backendappparsing)
   - [`pdf_parser.py`](#pdf_parserpy)
   - [`docx_parser.py`](#docx_parserpy)
   - [`excel_parser.py`](#excel_parserpy)
   - [`skill_extractor.py`](#skill_extractorpy)
   - [`embeddings.py`](#embeddingspy)
8. [Storage & Mail Services (`backend/app/storage/` & `services/`)](#8-storage--mail-services)
   - [`storage/client.py`](#storageclientpy)
   - [`services/mail_service.py`](#servicesmail_servicepy)
9. [Background Celery Workers (`backend/app/workers/`)](#9-background-celery-workers-backendappworkers)
   - [`celery_app.py`](#celery_apppy)
   - [`resume_tasks.py`](#resume_taskspy)
   - [`scoring_tasks.py`](#scoring_taskspy)
   - [`mail_tasks.py`](#mail_taskspy)
   - [`benchmark_tasks.py`](#benchmark_taskspy)
   - [`dead_letter.py`](#dead_letterpy)
   - [`comparative_tasks.py`](#comparative_taskspy)
   - [`workflow_tasks.py`](#workflow_taskspy)
10. [Observability (`backend/app/observability/`)](#10-observability-backendappobservability)
    - [`logging.py`](#loggingpy)
    - [`metrics.py`](#metricspy)
    - [`tracing.py`](#tracingpy)
11. [Scripts & Migrations (`backend/scripts/` & `alembic/`)](#11-scripts--migrations)
    - [`seed.py`](#seedpy)
    - [`backup.sh` & `restore.sh`](#backupsh--restoresh)

---

## 1. Application Core & Configuration

### `backend/app/main.py`
[main.py](file:///home/zoro/Desktop/TalentBench/backend/app/main.py) is the central entrypoint for the FastAPI REST API server. It sets up application lifecycle events, middleware pipelines (CORS, sliding-window rate limiting), routes, Prometheus metric endpoints, and system health checks.

#### Functions in `main.py`:

1. `lifespan(app: FastAPI)`
   - **What it does**: An asynchronous context manager governing startup and shutdown routines of the FastAPI server. On startup, it triggers structured logging configuration, initializes OpenTelemetry tracing, tests PostgreSQL connection, installs the `pgvector` extension if on PostgreSQL (`CREATE EXTENSION IF NOT EXISTS vector`), and creates missing database tables via SQLAlchemy metadata. On shutdown, it disposes of all pooled database connections cleanly.
   - **Why it is used**: Modern replacement for deprecated `@app.on_event("startup")` and `@app.on_event("shutdown")`. Guarantees clean resource allocation and release without connection leaks.
   - **How it works / How it will be used**: FastAPI executes the block before `yield` before accepting incoming HTTP requests. When the server process receives SIGTERM or SIGINT, execution resumes after `yield` to run `await async_engine.dispose()`.
   - **Where it is used**: Passed directly into the `FastAPI(..., lifespan=lifespan)` constructor.

2. `health_check()`
   - **What it does**: Handles `GET /health`. Executes a lightweight `SELECT 1` query against the database engine to verify database liveness and returns a JSON payload with service name, version, database status (`healthy` or `unhealthy`), and deployment environment.
   - **Why it is used**: Enables container orchestrators (Docker Compose, Kubernetes liveness/readiness probes) and AWS ALBs to determine instance health and automatically route traffic or restart failing pods.
   - **How it works / How it will be used**: Opens an async connection with `async_engine.connect()`, runs `SELECT 1`, and formats response. Returns HTTP 200 with status `"healthy"` or `"degraded"`.
   - **Where it is used**: Invoked by cloud load balancers, Kubernetes probes, and monitoring uptime bots.

3. `metrics()`
   - **What it does**: Handles `GET /metrics`. Collects all registered Prometheus metrics from the Python runtime and returns raw text in Prometheus exposition format with `media_type=CONTENT_TYPE_LATEST`.
   - **Why it is used**: Provides continuous operational telemetry (request counts, latency histograms, Celery task queue depths, LLM call timings).
   - **How it works / How it will be used**: Calls `prometheus_client.generate_latest()` and wraps the byte output in a Starlette `Response`.
   - **Where it is used**: Scraped periodically (e.g., every 15s) by Prometheus server as defined in `prometheus.yml`.

4. `root()`
   - **What it does**: Handles `GET /`. Returns general metadata about the service, documentation URLs (`/docs`), and health link.
   - **Why it is used**: Convenient root diagnostic endpoint for developers checking if the server is running.
   - **How it works / How it will be used**: Returns static JSON payload. Excluded from OpenAPI schema.
   - **Where it is used**: Browser navigation or smoke tests hitting the bare host URL.

---

### `backend/app/config.py`
[config.py](file:///home/zoro/Desktop/TalentBench/backend/app/config.py) defines the central environment configuration and validation schema using `pydantic-settings`. It loads variables from `.env` files and the OS environment.

#### Methods & Properties in `config.py`:

1. `Settings.parse_debug(cls, v: Any) -> bool`
   - **What it does**: Pydantic pre-validator for `DEBUG`. Converts truthy string representations (`"true"`, `"1"`, `"yes"`, `"debug"`, `"dev"`) or booleans into standard Python booleans.
   - **Why it is used**: Protects against environment string differences across deployment environments.
   - **How it works**: Inspects incoming value type and performs case-insensitive substring checks.
   - **Where it is used**: Automatically triggered whenever `Settings` is instantiated.

2. `Settings.sync_database_url` (property)
   - **What it does**: Returns a synchronous PostgreSQL connection URL formatted with the `psycopg2` driver (`postgresql+psycopg2://...`).
   - **Why it is used**: Celery worker processes and synchronous database administration scripts (such as Alembic or data seeding) require standard synchronous database drivers rather than async event loops.
   - **How it works**: Reads `DATABASE_URL` or constructs it from `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_PORT`, and `POSTGRES_DB`. Ensures the `postgresql+psycopg2://` driver prefix is used.
   - **Where it is used**: In `backend/app/database.py` to create `sync_engine`.

3. `Settings.get_async_database_url` (property)
   - **What it does**: Returns an asynchronous PostgreSQL connection URL formatted with the `asyncpg` driver (`postgresql+asyncpg://...`).
   - **Why it is used**: FastAPI endpoints utilize high-performance non-blocking async database operations.
   - **How it works**: Reads `ASYNC_DATABASE_URL` or dynamically builds `postgresql+asyncpg://user:pass@host:port/dbname`.
   - **Where it is used**: In `backend/app/database.py` to create `async_engine`, and in `main.py` lifespan to check for postgres extensions.

4. `Settings.get_redis_url` (property)
   - **What it does**: Resolves the complete Redis URI with host, port, db index, and optional authentication password (`redis://:password@host:port/db`).
   - **Why it is used**: Provides a single unified Redis endpoint for caching, rate limiting, and event streaming.
   - **How it works**: Checks `REDIS_URL` override; if missing, formats from `REDIS_PASSWORD`, `REDIS_HOST`, `REDIS_PORT`, and `REDIS_DB`.
   - **Where it is used**: By `RateLimitMiddleware`, Celery broker configurations, SSE event publishers, and LLM cache.

5. `Settings.get_celery_broker_url` & `Settings.get_celery_result_backend` (properties)
   - **What it does**: Returns URLs for Celery task dispatch and result storage.
   - **Why it is used**: Allows independent broker URLs (e.g. RabbitMQ or Amazon SQS) while defaulting conveniently to Redis.
   - **How it works**: Returns `CELERY_BROKER_URL` or falls back to `self.get_redis_url`.
   - **Where it is used**: In `backend/app/workers/celery_app.py` during Celery app initialization.

---

### `backend/app/database.py`
[database.py](file:///home/zoro/Desktop/TalentBench/backend/app/database.py) configures dual SQLAlchemy connection pools (one asynchronous for FastAPI, one synchronous for Celery workers) and session injection dependencies.

#### Functions in `database.py`:

1. `get_db() -> AsyncGenerator[AsyncSession, None]`
   - **What it does**: FastAPI dependency providing an asynchronous SQLAlchemy database session. Yields `AsyncSession`, automatically commits on clean completion, rolls back on exceptions, and ensures the session is closed in `finally`.
   - **Why it is used**: Guarantees transaction atomicity per HTTP request. Prevents leaked database connections in high-throughput environments.
   - **How it works**: Uses `async with AsyncSessionLocal() as session: yield session`. If an uncaught exception is raised in route handlers, `await session.rollback()` is executed.
   - **Where it is used**: Injected via `Depends(get_db)` across all FastAPI route handlers (`roles.py`, `candidates.py`, `upload.py`, `auth.py`, etc.).

2. `get_sync_db() -> Session`
   - **What it does**: Creates and returns a synchronous SQLAlchemy `Session` bound to `sync_engine`.
   - **Why it is used**: Celery tasks run synchronously in worker threads and cannot natively share an `asyncpg` connection pool.
   - **How it works**: Instantiates `SyncSessionLocal()` with explicit error handling.
   - **Where it is used**: In Celery worker task definitions (`resume_tasks.py`, `scoring_tasks.py`, `mail_tasks.py`, `comparative_tasks.py`, `workflow_tasks.py`).

---

## 2. Data Models (`backend/app/models/`)

The models define PostgreSQL tables via SQLAlchemy 2.0 declarative syntax, integrating with `pgvector` for semantic search.

### `base.py`
[base.py](file:///home/zoro/Desktop/TalentBench/backend/app/models/base.py) defines the shared declarative base and reusable mixins.
- `utc_now() -> datetime`: Helper function returning the current UTC timestamp with timezone (`datetime.now(timezone.utc)`). Used across model default columns to eliminate naive datetime bugs.
- `Base`: SQLAlchemy `DeclarativeBase` subclass from which all models inherit.
- `UUIDMixin`: Provides a string primary key `id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))`. Standardizes UUID identifier generation.
- `TimestampMixin`: Automatically injects `created_at` and `updated_at` timezone-aware timestamp columns with automatic `onupdate` hooks.

### `organization.py`
[organization.py](file:///home/zoro/Desktop/TalentBench/backend/app/models/organization.py) implements the multi-tenant enterprise data model.
- `Organization`: Represents a recruiting company/tenant. Fields: `name`, `logo_url`, `plan` (`free`, `pro`, `enterprise`), `seats_used`, `seats_total`. Cascades deletions to users, members, and roles.
- `OrgMember`: Represents individual recruiters and viewers inside an organization. Fields: `org_id` (foreign key), `name`, `email`, `role` (`admin`, `recruiter`, `viewer`), `avatar_url`, `last_active`.

### `user.py`
[user.py](file:///home/zoro/Desktop/TalentBench/backend/app/models/user.py) manages recruiter login credentials and authentication state.
- `User`: Fields: `org_id`, `email` (unique index), `hashed_password` (bcrypt hash), `name`, `avatar_url`, `role` (`admin`, `recruiter`, `viewer`), `is_active`. Used by JWT authentication mechanisms.

### `role.py`
[role.py](file:///home/zoro/Desktop/TalentBench/backend/app/models/role.py) models open job requisitions.
- `Role`: Fields:
  - `org_id`: Tenant foreign key.
  - `title`, `department`, `location`, `employment_type`, `description`.
  - `status`: Requisition lifecycle (`draft`, `active`, `closed`, `archived`).
  - `applicant_count`: Denormalized total candidate counter for instant dashboard rendering.
  - `jd_embedding`: Vector column (`Vector(1536)`) storing OpenAI/Gemini semantic embedding of the role's requirements.
  - `extracted_skills`: JSONB array of core technical skills required.
  - Relationships: Has many `rounds` (ordered), `candidates`, and one `benchmark_profile`.

### `round.py`
[round.py](file:///home/zoro/Desktop/TalentBench/backend/app/models/round.py) defines the customizable stages of a hiring pipeline for a role.
- `Round`: Fields:
  - `role_id`: Role foreign key.
  - `name`: Human-readable stage title (e.g. `"Resume Screen"`, `"DSA Round"`, `"Technical Interview"`).
  - `type`: Category (`resume_screen`, `aptitude_test`, `dsa_round`, `interview`, `custom`).
  - `order`: 0-indexed integer defining the sequence in the pipeline.
  - `input_source`: Where candidate assessment inputs originate (`excel_upload`, `manual_entry`, `ai_generated_link`).
  - `ai_scored`: Boolean flag indicating if AI evaluates candidates in this round.
  - `cutoff_threshold`: Numerical percentage score threshold (0-100) or count.
  - `cutoff_type`: `"percentage"` or `"count"` (e.g., select top 300 candidates).
  - `cutoff_count`: Optional explicit maximum candidate intake count.
  - `mail_template`: Jinja2 template string used for automated candidate communications.

### `candidate.py`
[candidate.py](file:///home/zoro/Desktop/TalentBench/backend/app/models/candidate.py) stores applicant profiles.
- `Candidate.__init__(**kwargs)`: Custom constructor that cleans and lowercases candidate emails, setting the primary key `id` to the email string by default (or generating a UUID). Prevents duplicate applications for the same candidate.
- `Candidate` Fields:
  - `id`: String primary key (email or UUID).
  - `role_id`: Associated job requisition.
  - `name`, `email`, `phone`, `avatar_url`, `resume_url`, `resume_text`.
  - `resume_embedding`: 1536-dimensional vector for cosine similarity matching against JD embeddings.
  - `status`: Current state (`applied`, `screened`, `tested`, `interviewed`, `hired`, `rejected`).
  - `current_round`: Index of the round the candidate is currently eligible for.
  - `overall_score`, `ai_match_score`: Composite evaluation scores (0–100).
  - `experience_years`, `current_company`, `skills` (JSONB), `projects` (JSONB), `education`, `location`.
  - `consent_on_file`: GDPR/compliance tracking flag.
  - Composite indexes on `("role_id", "status")` and `("role_id", "overall_score")` for sub-10ms dashboard filtering.

### `round_result.py`
[round_result.py](file:///home/zoro/Desktop/TalentBench/backend/app/models/round_result.py) stores the immutable evaluation record for a candidate in a specific round.
- `RoundResult`: Fields:
  - `candidate_id`, `round_id`: Foreign keys.
  - `round_name`, `round_type`: Denormalized fields to eliminate joins when returning candidate cards.
  - `status`: `"passed"`, `"failed"`, `"pending"`, `"skipped"`.
  - `score`: Evaluated integer score (0–100).
  - `ai_verdict`: High-level AI decision summary or personalized rejection rationale.
  - `ai_summary`: Detailed breakdown of strengths and missing skill gaps.
  - `overridden`: Boolean flag indicating whether a human recruiter manually altered the decision.
  - `override_reason`, `overridden_by`, `overridden_at`: Audit fields tracking human adjustments.

### `benchmark_profile.py`
[benchmark_profile.py](file:///home/zoro/Desktop/TalentBench/backend/app/models/benchmark_profile.py) defines the calibrated reference standard for a role.
- `BenchmarkProfile`: Fields:
  - `role_id`: 1-to-1 foreign key to `Role`.
  - `source_type`: Origin of standard (`jd_derived`, `historical_hire`, `comparative_tournament`).
  - `shortlisted_count`, `avg_resume_score`, `avg_test_score`, `avg_interview_score`.
  - `top_skills`, `top_projects`: The synthesized top benchmark projects derived across the pool.
  - `skill_weights`: Relative weight dictionary for skill scoring.
  - `profile_embedding`: Vector embedding of the benchmark profile.

### `audit_log.py`
[audit_log.py](file:///home/zoro/Desktop/TalentBench/backend/app/models/audit_log.py) provides immutable compliance and AI explainability records.
- `AuditLog`: Fields:
  - `candidate_id`: Foreign key to candidate.
  - `action`: Event name (e.g. `"Round evaluated"`, `"Decision overridden"`).
  - `actor`: Display name of agent or human (e.g., `"AI Evaluator"`, `"Alex Morgan"`).
  - `actor_type`: `"ai"`, `"recruiter"`, or `"system"`.
  - `detail`: Detailed textual log.
  - `prompt_template_id`, `model_name`, `model_input_snapshot`, `model_output_raw`, `final_decision`: Exact audit snapshot of the prompt and LLM completion generated before downstream actions are taken.

### `job_status.py`
[job_status.py](file:///home/zoro/Desktop/TalentBench/backend/app/models/job_status.py) provides idempotency and checkpointing for asynchronous Celery tasks.
- `JobStatus`: Fields:
  - `batch_id`, `role_id`, `candidate_id`.
  - `step`: Pipeline stage (`parse`, `embed`, `resume_screening`, `mail`, `report`).
  - `status`: `"pending"`, `"running"`, `"completed"`, `"failed"`, `"dead_letter"`.
  - `idempotency_key`: Unique key (`{batch_id}:{candidate_id}:{step}`). Workers verify this key before running to prevent duplicate processing on retries.
  - `attempts`, `error_detail`.

### `mail_queue.py`
[mail_queue.py](file:///home/zoro/Desktop/TalentBench/backend/app/models/mail_queue.py) manages candidate notifications.
- `MailQueue`: Outbox table tracking queued, sent, and failed candidate emails. Stores `recipient_email`, `subject`, `body_html`, `body_text`, `status`, `retry_count`, and `sent_at`.

---

## 3. Pydantic Schemas (`backend/app/schemas/`)

### `common.py`
[common.py](file:///home/zoro/Desktop/TalentBench/backend/app/schemas/common.py) provides generic API envelope types.
- `ApiResponse[T]`: Generic container wrapping single payloads: `{ "data": T, "message": str | None, "error": str | None }`. Ensures predictable JSON structure for the frontend client.
- `PaginatedResponse[T]`: Generic envelope for paginated candidate lists: `{ "data": list[T], "total": int, "page": int, "page_size": int, "has_more": bool }`.

### `domain.py`
[domain.py](file:///home/zoro/Desktop/TalentBench/backend/app/schemas/domain.py) declares Pydantic v2 domain schemas mirroring frontend TypeScript interfaces:
- **Round Models**: `RoundBase`, `RoundCreate`, `RoundUpdate`, `Round`.
- **Role Models**: `RoleBase`, `RoleCreate`, `RoleUpdate`, `Role`.
- **RoundResult Models**: `RoundResultBase`, `RoundResult`, `DecisionOverrideRequest`.
  - `DecisionOverrideRequest.target_status` (property): Helper returning either `new_status`, `status`, or default `"passed"`.
- **Candidate Models**: `CandidateBase`, `CandidateCreate`, `Candidate`.
- **Benchmark Profile**: `BenchmarkProfile`.
- **AuditLog**: `AuditLog`.
- **Performance Report**: `SkillScore`, `CategoryScore`, `RadarScore`, `PerformanceReport`.
- **Auth & Org**: `AuthUser`, `LoginRequest`, `SignupRequest`, `Organization`, `OrganizationUpdate`, `OrgMember`, `OrgMemberInvite`.
- **Dashboard**: `DashboardStats`.
- **Upload & Streaming**: `LiveUpdatePayload`, `LiveUpdateEvent`, `BulkUploadFileItem`, `BulkUploadRequest`, `BulkUploadResponse`, `ParseJobDescriptionResponse`.

---

## 4. Middleware & Security (`backend/app/middleware/`)

### `auth.py`
[auth.py](file:///home/zoro/Desktop/TalentBench/backend/app/middleware/auth.py) handles password cryptography, JWT tokens, and user dependency injection.

#### Functions in `auth.py`:

1. `verify_password(plain_password: str, hashed_password: str) -> bool`
   - **What it does**: Checks a plain text password against a stored bcrypt hash. Returns `True` if valid, `False` otherwise.
   - **Why it is used**: Authenticates users during `POST /auth/login`.
   - **How it works**: Invokes `bcrypt.checkpw()`, catching any encoding or format exceptions safely.
   - **Where it is used**: In `v1/auth.py` login endpoint.

2. `get_password_hash(password: str) -> str`
   - **What it does**: Generates a salted bcrypt hash of a given password string.
   - **Why it is used**: Securely stores recruiter and admin credentials without plaintext exposure.
   - **How it works**: Truncates password to 72 bytes (bcrypt specification limit), generates salt using `bcrypt.gensalt()`, and calls `bcrypt.hashpw()`.
   - **Where it is used**: In `v1/auth.py` signup and login seed routines, and `scripts/seed.py`.

3. `create_access_token(data: dict, expires_delta: timedelta | None = None) -> str`
   - **What it does**: Encodes an authentication payload dictionary into a signed JWT Bearer token string.
   - **Why it is used**: Issues tamper-proof stateless session tokens to the frontend client.
   - **How it works**: Appends expiration (`exp`) and issued-at (`iat`) claims, then signs using `jwt.encode()` with `settings.SECRET_KEY` and algorithm `HS256`.
   - **Where it is used**: In `v1/auth.py` during login and signup, and in `get_current_user`.

4. `decode_access_token(token: str) -> dict`
   - **What it does**: Decodes and verifies a JWT token string.
   - **Why it is used**: Verifies Bearer tokens on protected API endpoints.
   - **How it works**: Uses `jwt.decode()`. If the signature is invalid or expired, raises `HTTPException(401, detail="Could not validate credentials")`.
   - **Where it is used**: In `get_current_user` dependency.

5. `get_current_user(credentials, db) -> AuthUser`
   - **What it does**: FastApi security dependency that extracts the authenticated recruiter from the Bearer token header. If no token is provided, safely falls back to the seeded default recruiter for seamless local development.
   - **Why it is used**: Secures protected routes and supplies the active `user.id` and `org_id` context to route handlers.
   - **How it works**: Reads `credentials.credentials`, calls `decode_access_token()`, queries the `User` table for the ID, and returns an `AuthUser` schema.
   - **Where it is used**: Injected via `Depends(get_current_user)` in authenticated endpoints.

---

### `rate_limit.py`
[rate_limit.py](file:///home/zoro/Desktop/TalentBench/backend/app/middleware/rate_limit.py) implements a sliding-window rate limiter middleware.

#### Methods in `RateLimitMiddleware`:

1. `_get_redis() -> aioredis.Redis`
   - **What it does**: Lazily establishes and returns an asynchronous Redis client instance.
   - **Why it is used**: Avoids reconnecting to Redis on every HTTP request.
   - **Where it is used**: Inside `RateLimitMiddleware.dispatch`.

2. `dispatch(request: Request, call_next)`
   - **What it does**: Intercepts every incoming HTTP request. Identifies client (via Authorization header or client IP), computes a 1-minute window Redis key, increments the counter (`INCR`), and checks against configured limits (e.g. 30 req/min for uploads, 300 req/min default).
   - **Why it is used**: Protects the API against denial-of-service, scraping, and excessive file upload volume.
   - **How it works**: Bypasses documentation (`/docs`, `/metrics`, `/health`). If the client count exceeds the threshold, returns HTTP 429 Too Many Requests with header `Retry-After: 60`. If Redis is temporarily unreachable, degrades gracefully by allowing the request through.
   - **Where it is used**: Mounted globally on the FastAPI app in `main.py`.

---

## 5. API Routes (`backend/app/api/`)

### `router.py`
[router.py](file:///home/zoro/Desktop/TalentBench/backend/app/api/router.py) aggregates all domain routers into a single master `api_router`. Mounted in `main.py` under both `/api/v1` and `/api` prefixes for universal frontend compatibility.

---

### `v1/auth.py`
[auth.py](file:///home/zoro/Desktop/TalentBench/backend/app/api/v1/auth.py) manages recruiter authentication.

#### Endpoints & Functions:
1. `login(req: LoginRequest, db: AsyncSession)`
   - **What it does**: Handles `POST /auth/login`. Authenticates a recruiter by email and password. If the user doesn't exist in dev, automatically creates a demo recruiter and organization. Returns `AuthUser` with JWT.
   - **Why it is used**: Provides initial login access for recruiters.
   - **Where it is used**: Called by frontend `api.login()`.

2. `signup(req: SignupRequest, db: AsyncSession)`
   - **What it does**: Handles `POST /auth/signup`. Creates a new `Organization`, initial admin `User`, and `OrgMember`. Returns signed JWT.
   - **Why it is used**: Onboarding flow for new recruitment teams.
   - **Where it is used**: Called by frontend `api.signup()`.

---

### `v1/dashboard.py`
[dashboard.py](file:///home/zoro/Desktop/TalentBench/backend/app/api/v1/dashboard.py) provides high-level hiring metrics.

#### Endpoints & Functions:
1. `get_dashboard_stats(db: AsyncSession)`
   - **What it does**: Handles `GET /dashboard/stats`. Computes aggregate metrics: total roles, active roles, total applicants, monthly hires, average time-to-hire (24 days), and estimated pipeline value.
   - **Why it is used**: Powers the recruiter dashboard KPI banner.
   - **Where it is used**: Called by frontend `api.getDashboardStats()` on initial page load.

---

### `v1/roles.py`
[roles.py](file:///home/zoro/Desktop/TalentBench/backend/app/api/v1/roles.py) manages job requisitions, round configurations, JD parsing, and interactive agent workflow triggers.

#### Helper Functions:
1. `default_rounds_for_role(role_id: str) -> list[Round]`
   - **What it does**: Instantiates the standard 4-stage pipeline for a new role: Resume Screen (order 0), Aptitude & Reasoning (order 1), DSA Round (order 2), Technical Interview (order 3).
   - **Why it is used**: Eliminates manual pipeline configuration when creating a new job opening.
   - **Where it is used**: Inside `create_role()`.

2. `to_role_schema(role: Role) -> RoleSchema`
   - **What it does**: Serializes a SQLAlchemy `Role` model (and its eager-loaded `Round` children) into a clean Pydantic `RoleSchema`.
   - **Why it is used**: Guarantees date string formatting and eliminates lazy-loading attribute errors outside database sessions.
   - **Where it is used**: Returned by `get_roles`, `get_role`, `create_role`, `update_role`.

#### Endpoints:
3. `get_roles(db: AsyncSession)`: `GET /roles` — Lists all open roles ordered by creation date with rounds loaded.
4. `get_role(role_id: str, db: AsyncSession)`: `GET /roles/{role_id}` — Retrieves role details.
5. `create_role(req: RoleCreate, db: AsyncSession)`: `POST /roles` — Creates a role, calculates the semantic vector embedding of the JD, extracts required skills, creates default rounds, and initializes a `BenchmarkProfile`.
6. `upload_job_description_file(role_id: str, file: UploadFile, db: AsyncSession)`: `POST /roles/{role_id}/upload-jd` — Parses uploaded PDF/DOCX/TXT file, updates role description, extracts skills, and recomputes the embedding.
7. `parse_job_description_file(file: UploadFile)`: `POST /roles/parse-jd` — Stateless JD file parser. Extracts raw text and suggests a role title from headings for recruiter review prior to role creation.
8. `update_role(role_id: str, req: RoleUpdate, db: AsyncSession)`: `PUT /roles/{role_id}` — Updates role fields and updates embeddings if the description changed.
9. `delete_role(role_id: str, db: AsyncSession)`: `DELETE /roles/{role_id}` — Deletes role and cascades deletions to candidates and rounds.
10. `update_rounds(role_id: str, rounds_data: list[RoundUpdate], db: AsyncSession)`: `PUT /roles/{role_id}/rounds` — Replaces or updates the sequence of hiring rounds.
11. `screen_text_endpoint(req: ScreenTextRequest)`: `POST /roles/screen-text` — Directly tests resume text against JD text via LLM. Returns `"yes"` if matched or a personalized rejection email body explaining missing gaps.
12. `polish_job_description_endpoint(req: PolishJobDescriptionRequest)`: `POST /roles/polish-jd` — Removes boilerplate/fluff from JD text using LLM, estimating character and token savings.
13. `export_resumes_excel(role_id: str, db: AsyncSession)`: `GET /roles/{role_id}/export-resumes-excel` — Generates a 2-sheet Excel workbook (`Shortlisted Candidates` and `Rejected Candidates`) containing rank, ID, email, match score, verdict, skill gaps, and full resume text.
14. `trigger_comparative_matching(role_id: str, db: AsyncSession)`: `POST /roles/{role_id}/run-comparative-matching` — Dispatches Celery task `run_comparative_resume_matching` for tournament synthesis and comparative ranking.
15. `get_comparative_benchmark(role_id: str, db: AsyncSession)`: `GET /roles/{role_id}/comparative-benchmark` — Returns synthesized Top 10 Benchmark Projects and cutoff count.
16. `start_round_workflow(role_id: str, round_id: str, db: AsyncSession)`: `POST /roles/{role_id}/rounds/{round_id}/start-workflow` — Initiates interactive multi-step agent workflow execution.
17. `get_round_workflow_status(role_id: str, round_id: str)`: `GET /roles/{role_id}/rounds/{round_id}/workflow-status` — Reads real-time agent workflow logs and metrics from Redis.
18. `reset_round_workflow(role_id: str, round_id: str, db: AsyncSession)`: `POST /roles/{role_id}/rounds/{round_id}/reset-workflow` — Resets candidates back to `"applied"` state for presentation demos.

---

### `v1/candidates.py`
[candidates.py](file:///home/zoro/Desktop/TalentBench/backend/app/api/v1/candidates.py) provides candidate querying and detail views.

#### Helper Functions:
1. `to_candidate_schema(c: Candidate) -> CandidateSchema`
   - **What it does**: Transforms a `Candidate` SQLAlchemy model (with eager-loaded `round_results`) into `CandidateSchema`.
   - **Where it is used**: In `get_candidates` and `get_candidate`.

#### Endpoints:
2. `get_candidates(...)`: Handles `GET /roles/{role_id}/candidates` and `GET /candidates`. Supports pagination (`page`, `page_size`), search queries (name, email, company), status filtering (`applied`, `screened`, `hired`, `rejected`), and sorting (`score_desc`, `score_asc`, `recent`).
3. `get_candidate(candidate_id: str, db: AsyncSession)`: Handles `GET /candidates/{candidate_id}`. Decodes URL-encoded email identifiers and retrieves the full candidate history with all round results.

---

### `v1/decisions.py`
[decisions.py](file:///home/zoro/Desktop/TalentBench/backend/app/api/v1/decisions.py) enables human recruiters to review and override automated AI decisions.

#### Endpoints:
1. `override_decision(candidate_id: str, req: DecisionOverrideRequest, round_id: str | None, db: AsyncSession)`
   - **What it does**: Handles `POST /candidates/{candidate_id}/override`. Updates a candidate's round result status (e.g. from `failed` to `passed`), marks `overridden=True`, stores recruiter name and reason, updates candidate status, and creates an immutable `AuditLog` entry.
   - **Why it is used**: Core requirement for human-in-the-loop recruiter governance.
   - **Where it is used**: Recruiter candidate drawer in the frontend UI.

---

### `v1/audit.py`
[audit.py](file:///home/zoro/Desktop/TalentBench/backend/app/api/v1/audit.py) exposes the transparent explainability log.

#### Endpoints:
1. `get_candidate_audit_log(candidate_id: str, db: AsyncSession)`
   - **What it does**: Handles `GET /candidates/{candidate_id}/audit-log`. Returns chronological audit log items showing every action taken on a candidate (ingestion, AI screening, emails sent, overrides).
   - **Where it is used**: Candidate drawer "Audit Log" tab.

---

### `v1/reports.py`
[reports.py](file:///home/zoro/Desktop/TalentBench/backend/app/api/v1/reports.py) compiles benchmark comparison and feedback reports.

#### Endpoints:
1. `get_performance_report(candidate_id: str, db: AsyncSession)`
   - **What it does**: Handles `GET /candidates/{candidate_id}/performance-report`. Compiles radar dimension scores (Resume Match, Project Depth, Aptitude, Communication, DSA, Culture Fit), skill breakdowns against benchmark averages, and actionable improvement recommendations.
   - **Where it is used**: Candidate drawer "Performance Report" tab.

---

### `v1/upload.py`
[upload.py](file:///home/zoro/Desktop/TalentBench/backend/app/api/v1/upload.py) handles bulk applicant ingestion.

#### Endpoints:
1. `bulk_upload(role_id, req, db)`: Handles `POST /roles/{role_id}/upload`. Mock ingestion endpoint generating realistic candidate records for scale testing, enqueueing Celery batch processing.
2. `upload_resume_files(role_id, files, db)`: Handles `POST /roles/{role_id}/upload-files`. Accepts multipart uploaded resume files (PDF, DOCX, TXT), parses resume text, extracts names and emails via regex/heuristics, creates `Candidate` records, and dispatches Celery batch tasks.

---

### `v1/org.py`
[org.py](file:///home/zoro/Desktop/TalentBench/backend/app/api/v1/org.py) provides organization profile and team management.

#### Endpoints & Helpers:
1. `get_or_create_default_org(db)`: Helper ensuring an organization exists.
2. `get_org()`, `update_org()`: Organization settings management.
3. `get_org_members()`, `invite_member()`, `remove_member()`: Team seat management and role assignment.

---

### `v1/events.py`
[events.py](file:///home/zoro/Desktop/TalentBench/backend/app/api/v1/events.py) implements real-time Server-Sent Events (SSE).

#### Endpoints & Helpers:
1. `subscribe_role_events(role_id: str, request: Request)`: Handles `GET /roles/{role_id}/events`. Establishes an SSE stream subscribing to Redis channel `talentbench:events:{role_id}`. Pushes candidate updates, screening completions, and workflow logs directly to the browser.

---

### `v1/benchmark.py`
[benchmark.py](file:///home/zoro/Desktop/TalentBench/backend/app/api/v1/benchmark.py) exposes benchmark profile retrieval and background generation.

#### Endpoints:
1. `get_benchmark_profile(role_id: str, db)`: Retrieves `BenchmarkProfile` for the role.
2. `trigger_benchmark_generation(role_id: str, db)`: Enqueues background Celery task `build_benchmark_profile_from_source`.

---

### `v1/attention.py`
[attention.py](file:///home/zoro/Desktop/TalentBench/backend/app/api/v1/attention.py) implements the Dead-Letter Queue (DLQ) surface.

#### Endpoints:
1. `get_attention_needed_jobs(role_id: str, db)`: Handles `GET /roles/{role_id}/attention-needed`. Lists jobs in `failed` or `dead_letter` status with error details.
2. `retry_failed_job(job_id: str, db)`: Handles `POST /jobs/{job_id}/retry`. Resets job state to `pending` and re-dispatches the Celery worker task.

---

## 6. LLM Engine & Providers (`backend/app/llm/`)

### `gateway.py`
[gateway.py](file:///home/zoro/Desktop/TalentBench/backend/app/llm/gateway.py) defines the abstract interface `LLMGateway` and Pydantic models for all model interactions:
- `LLMResponse`, `EvalResponse`, `ScreenResult`, `BenchmarkProject`, `ComparativeScoreResult`.
- Abstract methods: `complete`, `evaluate`, `embed`, `stream`, `extract_skills_and_projects`, `reduce_projects`, `screen_candidate`, `polish_job_description`, `synthesize_top_benchmark_projects`, `comparative_score_candidate`.

---

### `cache.py`
[cache.py](file:///home/zoro/Desktop/TalentBench/backend/app/llm/cache.py) implements Redis-backed prompt caching.

#### Methods in `LLMCache`:
1. `generate_key(prefix: str, prompt: str, **kwargs) -> str`: Normalizes prompt text and generates a SHA-256 cache key (`talentbench:llm:{prefix}:{hash}`).
2. `get(key: str) -> dict | None`: Retrieves cached model response if enabled.
3. `set(key: str, value: dict, ttl: int | None = None)`: Caches response with default 7-day TTL.

---

### `rate_limiter.py`
[rate_limiter.py](file:///home/zoro/Desktop/TalentBench/backend/app/llm/rate_limiter.py) implements proactive and reactive rate limiters for external LLM APIs.

#### Classes & Methods:
1. `GroqRateLimiter` & `GeminiRateLimiter`:
   - `acquire(estimated_tokens: int)`: Proactively checks rolling 1-minute and 1-day request and token counts in Redis pipelines (falling back to in-memory `collections.deque`). If limits would be exceeded, calculates wait time and sleeps before dispatching the request.
   - `record_actual_tokens(model, actual_tokens, estimated_tokens)`: Adjusts rolling token counters with exact token counts returned by the API response.
   - `parse_retry_after(error_message: str) -> float | None`: Parses `"try again in Xs"` or `"retry after Xs"` from 429 error messages via regex.
   - `handle_backoff(attempt: int, error: Exception | str)`: Sleeps using exponential backoff with random jitter or parsed retry-after durations.

---

### `providers/gemini_provider.py`
[gemini_provider.py](file:///home/zoro/Desktop/TalentBench/backend/app/llm/providers/gemini_provider.py) is the primary production LLM provider using Google Gemini (`gemini-3.5-flash-lite`).

#### Helper Functions:
1. `_clean_json_text(text: str) -> str`: Strips markdown fences (` ```json `) and extracts valid JSON objects or arrays from conversational LLM responses.
2. `_format_model_tag(model_name: str) -> str`: Standardizes model identifier tags.

#### Methods in `LangChainGeminiProvider`:
1. `estimate_tokens(text: str) -> int`: Fast token estimation (~3.8 characters per token).
2. `select_model_for_prompt(prompt, system_prompt)`: Selects `gemini-3.5-flash-lite` and estimates tokens.
3. `_execute_with_retry(...)`: Core HTTP executor using `httpx.AsyncClient` hitting Google's `generateContent` REST endpoint with timeout, rate limit acquisition, token usage reporting, and exponential backoff.
4. `complete(...)`: General text completion with JSON mode support.
5. `evaluate(...)`: Evaluates candidates against assessment rubrics, returning structured `EvalResponse`.
6. `screen_candidate(jd_text, resume_text, candidate_name)`: Evaluates candidate resume against JD. Checks that internship experience does not count as full-time experience; returns `ScreenResult(matched=True, verdict='yes')` or a personalized rejection email body detailing missing skills.
7. `extract_skills_and_projects(resume_text)`: Extracts skills, projects, years of experience, and education from resume text into structured JSON.
8. `reduce_projects(projects, target_count, role_context)`: Token-bounded reducer picking top representative projects.
9. `polish_job_description(jd_text)`: Prompts Gemini to strip fluff and legal boilerplate from JD text.
10. `synthesize_top_benchmark_projects(jd_text, candidate_project_batches)`: Sliding-window tournament synthesis deriving Top 10 Benchmark Projects across the applicant pool.
11. `comparative_score_candidate(...)`: Scores candidate projects against benchmark projects, identifying relative depth and recommended project directions.
12. `embed(text: str) -> list[float]`: Generates a deterministic normalized 1536-dimensional embedding vector.
13. `stream(prompt, system_prompt)`: Asynchronous word-by-word streaming generator.

---

### `providers/groq_provider.py`
[groq_provider.py](file:///home/zoro/Desktop/TalentBench/backend/app/llm/providers/groq_provider.py) implements the provider using LangChain's `ChatGroq` with `qwen/qwen3.8-27b`, incorporating `GroqRateLimiter` and error backoff wrappers.

---

### `providers/mock.py`
[mock.py](file:///home/zoro/Desktop/TalentBench/backend/app/llm/providers/mock.py) provides a high-fidelity, deterministic mock LLM implementation for local testing, unit tests, and offline demonstrations without API keys.

---

### `llm/__init__.py`
[__init__.py](file:///home/zoro/Desktop/TalentBench/backend/app/llm/__init__.py) provides the factory function:
- `get_llm_gateway(reload: bool = False) -> LLMGateway`: Instantiates and caches the singleton `LLMGateway` instance matching `settings.LLM_PROVIDER` (`gemini`, `groq`, or `mock`).

---

## 7. Parsing & Vector Scoring (`backend/app/parsing/`)

### `pdf_parser.py`
[pdf_parser.py](file:///home/zoro/Desktop/TalentBench/backend/app/parsing/pdf_parser.py) handles PDF document text extraction.
- `parse_pdf(file_bytes: bytes) -> str`: Loads bytes via `pypdf.PdfReader` and concatenates page text with double newlines.

### `docx_parser.py`
[docx_parser.py](file:///home/zoro/Desktop/TalentBench/backend/app/parsing/docx_parser.py) handles Microsoft Word documents.
- `parse_docx(file_bytes: bytes) -> str`: Parses `.docx` files via python-docx `Document`, extracting both text paragraphs and tabular cell rows.

### `excel_parser.py`
[excel_parser.py](file:///home/zoro/Desktop/TalentBench/backend/app/parsing/excel_parser.py) handles external assessment spreadsheets.
- `parse_round_results_excel(file_bytes: bytes) -> list[dict[str, Any]]`: Parses Excel/CSV files containing external round results (Aptitude/DSA tests). Normalizes column names (`email`, `score`, `verdict`, `feedback`), cleans data, and returns standard dictionaries.

### `skill_extractor.py`
[skill_extractor.py](file:///home/zoro/Desktop/TalentBench/backend/app/parsing/skill_extractor.py) provides regex and dictionary-based metadata extraction.
- `extract_candidate_metadata(text: str) -> dict[str, Any]`: Uses regular expressions to extract email, phone number, candidate name heuristics, and matches technical terms against `KNOWN_SKILLS` (40+ technical keywords like Python, FastAPI, Docker, Kubernetes, etc.).

### `embeddings.py`
[embeddings.py](file:///home/zoro/Desktop/TalentBench/backend/app/parsing/embeddings.py) computes semantic and hybrid matching scores.
- `cosine_similarity(v1, v2) -> float`: Calculates normalized dot product between two vector embeddings.
- `compute_jd_match_score(resume_embedding, jd_embedding, candidate_skills, required_skills) -> int`: Computes composite score: 60% semantic vector cosine similarity + 40% keyword skill overlap. Returns integer (0–100).

---

## 8. Storage & Mail Services

### `storage/client.py`
[storage.py](file:///home/zoro/Desktop/TalentBench/backend/app/storage/client.py) wraps S3 / MinIO object storage.

#### Methods in `StorageClient`:
1. `_ensure_buckets()`: Creates default buckets (`talentbench-resumes`, `talentbench-exports`) if they do not exist.
2. `upload_file(bucket, key, file_bytes, content_type) -> str`: Uploads binary objects to S3.
3. `download_file(bucket, key) -> bytes`: Downloads stored file contents.
4. `generate_presigned_url(bucket, key, expires_in) -> str`: Generates signed temporary download URLs for recruiters viewing resumes.

---

### `services/mail_service.py`
[mail_service.py](file:///home/zoro/Desktop/TalentBench/backend/app/services/mail_service.py) handles email template compilation.

#### Methods in `MailService`:
1. `generate_invitation_mail(...)`: Prompts the LLM for a 1-sentence personalized praise based on candidate skills, then renders `INVITATION_MAIL_TEMPLATE` with Jinja2.
2. `generate_gap_mail(...)`: Prompts the LLM for a 2-sentence actionable feedback summary, then renders `GAP_FEEDBACK_MAIL_TEMPLATE`.
3. `send_mail(to_email, subject, body)`: Dispatches email via SMTP or logs transmission.

---

## 9. Background Celery Workers (`backend/app/workers/`)

### `celery_app.py`
[celery_app.py](file:///home/zoro/Desktop/TalentBench/backend/app/workers/celery_app.py) configures the distributed task queue:
- Connects to Redis broker and result backend.
- Sets `task_acks_late=True` (ensuring crash safety so terminated worker tasks return to the queue).
- Sets `worker_prefetch_multiplier=1` (fair dispatch for long-running AI evaluations).
- Maps tasks to dedicated queues (`resume_queue`, `scoring_queue`, `mail_queue`, `benchmark_queue`, `dlq_queue`).

---

### `resume_tasks.py`
[resume_tasks.py](file:///home/zoro/Desktop/TalentBench/backend/app/workers/resume_tasks.py) executes resume parsing and screening.

#### Functions:
1. `get_redis_sync()`: Returns synchronous Redis client.
2. `publish_event(role_id, event_type, payload)`: Publishes real-time JSON events to Redis channel `talentbench:events:{role_id}`.
3. `process_single_candidate_resume(self, batch_id, role_id, candidate_id, resume_s3_key)`:
   - **What it does**: Idempotently screens a candidate's resume.
   - **How it works**: Checks `JobStatus` with key `{batch_id}:{candidate_id}:resume_screening`. Runs `llm.screen_candidate()` against the JD. Writes a `RoundResult`, an immutable `AuditLog` row, and updates candidate status. If candidate fails, queues a personalized rejection email in `MailQueue`. If candidate passes and is within cutoff limits, advances `current_round = 1`. Emits an SSE event.
4. `process_batch_resumes(batch_id, role_id, candidate_ids)`: Fan-out orchestrator task that enqueues `process_single_candidate_resume` for each candidate in a batch.

---

### `scoring_tasks.py`
[scoring_tasks.py](file:///home/zoro/Desktop/TalentBench/backend/app/workers/scoring_tasks.py) evaluates subsequent round assessments.

#### Functions:
1. `evaluate_candidate_round(self, candidate_id, round_id, raw_input_data)`: Evaluates aptitude tests, DSA rounds, or technical interview notes against round rubrics. Creates `RoundResult` and `AuditLog`, updates candidate round status, and publishes SSE events.

---

### `mail_tasks.py`
[mail_tasks.py](file:///home/zoro/Desktop/TalentBench/backend/app/workers/mail_tasks.py) handles asynchronous mail delivery.

#### Functions:
1. `queue_and_send_candidate_mail(self, candidate_id, mail_type, round_id, context)`: Compiles personalized emails via `mail_service`, logs sent status to `MailQueue` and `AuditLog`, and transmits the email.

---

### `benchmark_tasks.py`
[benchmark_tasks.py](file:///home/zoro/Desktop/TalentBench/backend/app/workers/benchmark_tasks.py) derives reference standards.

#### Functions:
1. `build_benchmark_profile_from_source(role_id, source_type, source_candidate_ids)`: Runs a token-bounded map-reduce on reference candidate projects, calculates skill weights, computes benchmark vector embeddings, and stores the resulting `BenchmarkProfile`.

---

### `dead_letter.py`
[dead_letter.py](file:///home/zoro/Desktop/TalentBench/backend/app/workers/dead_letter.py) manages permanently failed jobs.

#### Functions:
1. `move_to_dead_letter_queue(job_id: str, error_message: str)`: Updates `JobStatus.status` to `"dead_letter"`, surfacing the job in the recruiter's `Attention Needed` dashboard queue.

---

### `comparative_tasks.py`
[comparative_tasks.py](file:///home/zoro/Desktop/TalentBench/backend/app/workers/comparative_tasks.py) executes tournament-style benchmark synthesis and ranking.

#### Functions:
1. `run_comparative_resume_matching(self, role_id: str)`:
   - **Step 1**: Chunks all applicants into token-bounded batches.
   - **Step 2**: Runs sliding-window tournament synthesis to extract the Top 10 Benchmark Projects across the candidate pool and saves them to `BenchmarkProfile`.
   - **Step 3**: Concurrently scores every candidate against the benchmark projects and the JD using `llm.comparative_score_candidate`.
   - **Step 4**: Sorts candidates by comparative score. Candidates within the cutoff advance to Round 2 (`screened`). For disqualified candidates outside the cutoff, queues personalized rejection emails detailing their exact skill gap and the specific project architecture they should build.

---

### `workflow_tasks.py`
[workflow_tasks.py](file:///home/zoro/Desktop/TalentBench/backend/app/workers/workflow_tasks.py) orchestrates live agent workflow demonstrations.

#### Functions:
1. `get_redis_client()`: Returns Redis client for workflow state management.
2. `update_workflow_state(...)`: Updates workflow progress, step index, logs, and statistics in Redis key `talentbench:workflow:{role_id}:{round_id}` with 24-hour expiration.
3. `stream_agent_log(...)`: Formats structured agent log entries with timestamps, appends them to Redis state, and publishes them over SSE.
4. `run_round_workflow(self, role_id: str, round_id: str)`: Executes the live production 6-step agent workflow (candidate discovery, skills analysis, benchmark project synthesis, comparative scoring, cutoff ranking, email dispatch) for any hiring round.

---

## 10. Observability (`backend/app/observability/`)

### `logging.py`
[logging.py](file:///home/zoro/Desktop/TalentBench/backend/app/observability/logging.py) configures structured logging.
- `setup_logging(debug: bool = False)`: Configures `structlog` with ISO timestamps, exception formatting, and log-level additions. In debug mode, renders colorful console output; in production, outputs single-line JSON for aggregation into Datadog, Loki, or CloudWatch.

### `metrics.py`
[metrics.py](file:///home/zoro/Desktop/TalentBench/backend/app/observability/metrics.py) declares Prometheus metric instruments:
- `REQUEST_COUNT` (Counter): HTTP requests by method, endpoint, status code.
- `REQUEST_LATENCY` (Histogram): Request latency distributions.
- `CANDIDATES_PROCESSED` (Counter): Total screened resumes.
- `LLM_CALL_DURATION` (Histogram): Latency of LLM calls by provider and operation.
- `MAIL_SENT_TOTAL` (Counter): Emails delivered.
- `QUEUE_DEPTH` (Gauge): Current Celery task backlog.
- `DLQ_SIZE` (Gauge): Number of dead-letter jobs needing recruiter attention.

### `tracing.py`
[tracing.py](file:///home/zoro/Desktop/TalentBench/backend/app/observability/tracing.py) configures OpenTelemetry distributed tracing.
- `setup_tracing(service_name: str)`: Initializes `TracerProvider` and attaches `OTLPSpanExporter` if `OTEL_EXPORTER_OTLP_ENDPOINT` is configured.
- `get_tracer(name: str)`: Returns an OpenTelemetry tracer for custom span instrumentation.

---

## 11. Scripts & Migrations

### `seed.py`
[seed.py](file:///home/zoro/Desktop/TalentBench/backend/scripts/seed.py) populates realistic mock data for development.
- `seed_database()`: Ensures database tables exist, creates default organization ("TalentBench Demo Co."), admin recruiter ("Alex Morgan"), 7 org team members, 6 open job requisitions (Engineering, Design, Data), standard rounds, and 60 realistic applicants with scores, audit logs, and round results.

### `backup.sh` & `restore.sh`
- `backup.sh`: Executes compressed `pg_dump` of the PostgreSQL database, computes SHA256 checksums, and syncs to S3.
- `restore.sh`: Validates and restores database state from a backup archive file.
