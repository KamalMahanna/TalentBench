# TalentBench Core Mindmap

> Visual architectural graph of core system components, algorithmic engines, background workers, and data flow. Presentation and UI/UX layers are strictly excluded.

```mermaid
graph TD
    %% ROOT
    TB["TalentBench Core System"]

    %% MAIN SUBDOMAINS
    TB --> INGEST["1. Ingestion & Document Parsing"]
    TB --> LLM["2. LLM Gateway & Provider Router"]
    TB --> SCREEN["3. AI Screening & Scoring Engine"]
    TB --> TOURN["4. Comparative Tournament & Cutoffs"]
    TB --> PIPE["5. Multi-Stage Rounds Coordinator"]
    TB --> QUEUE["6. Distributed Task Queues & Celery Workers"]
    TB --> EMAIL["7. Outbound Transactional Mail Engine"]
    TB --> DATA["8. Data Layer & Schema Entities"]
    TB --> APIS["9. Core API Gateway Endpoints"]

    %% 1. INGESTION
    INGEST --> P_PDF["PDF Extraction\n(pdfjs / pdf_parser.py)"]
    INGEST --> P_DOC["DOCX Extraction\n(mammoth / docx_parser.py)"]
    INGEST --> P_XLS["Excel & CSV Parsing\n(SheetJS / excel_parser.py)"]
    INGEST --> P_SKILL["Skill & Experience Extractor\n(Regex heuristics & token matcher)"]
    INGEST --> P_S3["Object Storage Client\n(MinIO / S3 document store)"]

    %% 2. LLM GATEWAY
    LLM --> GW_ROUTER["Gateway Router\n(llm-gateway.ts / gateway.py)"]
    GW_ROUTER --> PROV_GEMINI["Primary: Google Gemini\n(gemini-2.5-flash)"]
    GW_ROUTER --> PROV_GROQ["Secondary: Groq Cloud\n(llama-3.3-70b-versatile)"]
    GW_ROUTER --> PROV_MOCK["Fallback: Deterministic Mock\n(Zero-latency local fallback)"]
    LLM --> GW_LIMIT["Rate Limiter\n(Token bucket & sliding window)"]
    LLM --> GW_GUARD["Guardrails Validator\n(Strict JSON schema & 0-100 score bounds)"]
    LLM --> GW_CACHE["Redis Prompt Cache\n(SHA-256 hash matching)"]

    %% 3. SCREENING & SCORING
    SCREEN --> SC_SINGLE["Single Resume Screener\n(screen-single / resume_screener.ts)"]
    SCREEN --> SC_JD["JD Strict Criteria Matcher\n(Tech stack & experience compliance)"]
    SCREEN --> SC_TRACE["Agent Reasoning Trace Generator\n(Structured JSON decision traces)"]
    SCREEN --> SC_RUBRIC["Weighted Scoring Rubric\n(Criteria penalty calculation)"]
    SCREEN --> SC_BATCH["Batch Screening Pipeline\n(Parallel queue execution)"]

    %% 4. TOURNAMENT & RANKING
    TOURN --> TN_GATE["Cutoff Gate Evaluator\n(Auto-activates when pool > cutoff)"]
    TOURN --> TN_PAIR["Pairwise Head-to-Head Evaluator\n(Direct candidate trade-off comparison)"]
    TOURN --> TN_ELO["Leaderboard & Win-Loss Aggregator\n(Elo / relative percentile scoring)"]
    TOURN --> TN_SLICE["Top-N Pool Slicer\n(Advances cutoff threshold pool)"]

    %% 5. MULTI-STAGE ROUNDS
    PIPE --> ST_SM["Rounds State Machine\n(Pending -> Running -> Finished -> Failed)"]
    PIPE --> R0["Round 0: Resume Shortlisting\n(AI initial criteria match)"]
    PIPE --> R1["Round 1: Aptitude & Reasoning\n(Cognitive & logic evaluation link)"]
    PIPE --> R2["Round 2: Coding & DSA\n(Live system algorithms & test execution)"]
    PIPE --> R3["Round 3: Communication\n(Architecture & presentation review)"]
    PIPE --> R4["Round 4: HR Round\n(Values, culture & comp alignment)"]
    PIPE --> ST_ADV["Candidate Round Progression\n(currentRound increment & RoundResult write)"]
    PIPE --> ST_OVR["Recruiter Manual Override Loop\n(Human-in-the-loop audit update)"]

    %% 6. DISTRIBUTED WORKERS
    QUEUE --> Q_REDIS["Redis Message Broker\n(Port 6379 / task queues)"]
    QUEUE --> W_RESUME["Resume Screening Worker\n(Concurrency: 8 / batch task runner)"]
    QUEUE --> W_SCORE["Scoring Worker\n(Criteria weight calculations)"]
    QUEUE --> W_COMP["Comparative Tournament Worker\n(Pool tournament tasks)"]
    QUEUE --> W_MAIL["Mail Dispatch Worker\n(Async outbound queue)"]
    QUEUE --> W_DEAD["Dead-Letter & Fault Queue\n(Retry policy & failure telemetry)"]

    %% 7. EMAIL ENGINE
    EMAIL --> EM_SRV["Email Service Engine\n(Nodemailer / aiosmtplib)"]
    EMAIL --> EM_INV["Personalized Interview Invitation\n(Shortlisted candidate details)"]
    EMAIL --> EM_REJ["Constructive Feedback Email\n(Detailed missing skills report)"]
    EMAIL --> EM_AUD["Delivery Status Auditor\n(NOT_SENT -> SENT / FAILED)"]

    %% 8. DATA LAYER
    DATA --> M_JOB["JobProfile / Role\n(JD, bounds, cutoffs, pipeline)"]
    DATA --> M_ROUND["PipelineRound\n(Type, order, config JSON)"]
    DATA --> M_CAND["Candidate\n(Resume, skills, status, currentRound)"]
    DATA --> M_RES["RoundResult\n(Score, passed, agentTrace, feedback)"]
    DATA --> M_LOG["AuditLog\n(Override reasons & recruiter actions)"]
    DATA --> M_USER["User & Org\n(JWT auth & role-based tenancy)"]

    %% 9. APIS
    APIS --> API_JOBS["/api/jobs & /api/jobs/:id\n(JobProfile CRUD & pipeline sync)"]
    APIS --> API_CAND["/api/candidates\n(Upload, batch screen, sync, report)"]
    APIS --> API_AI["/api/ai\n(screen-single & tournament execution)"]
    APIS --> API_OVR["/api/candidates/:id/override\n(Recruiter status override)"]
    APIS --> API_MAIL["/api/email/send\n(Single & bulk email dispatch)"]
    APIS --> API_XLS["/api/jobs/:id/export-excel\n(XLSX pool stream generation)"]
```

---

## 2. End-to-End Processing & Data Flow Graph

```mermaid
flowchart TD
    %% INGESTION
    A["Raw Resume Files\n(PDF, DOCX, TXT, Excel)"] --> B["Document Parser Subsystem\n(pdf_parser, docx_parser, excel_parser)"]
    B --> C["MinIO / S3 Storage\n(Raw File Archive)"]
    B --> D["Regex Skill & Experience Extractor\n(Normalized Candidate Metadata)"]
    
    %% DB STORAGE
    D --> E[("Database: Candidate Records\nstatus = PENDING, currentRound = 0")]
    
    %% RECRUITER TRIGGER
    E --> F["Batch Screening Trigger\n(/api/jobs/:id/candidates/screen-batch)"]
    
    %% QUEUE / WORKER
    F --> G["Redis Task Queue\n(resume_screening queue)"]
    G --> H["Celery Resume Worker Pool\n(High Concurrency: 8 workers)"]
    
    %% LLM GATEWAY
    H --> I["LLM Gateway\n(Provider Router & Token Bucket Limiter)"]
    I --> J{"Provider Availability"}
    J -->|Primary| K["Google Gemini 2.5 Flash"]
    J -->|Secondary| L["Groq Cloud Llama 3.3 70B"]
    J -->|Offline / Test| M["Deterministic Mock Engine"]
    
    K --> N["Output Guardrails & Schema Validator\n(Enforces JSON Structure & 0-100 Score)"]
    L --> N
    M --> N
    
    %% EVALUATION RESULT
    N --> O["Scoring Rubric Evaluator\n(Match Score, Experience Compliance, Red Flags)"]
    O --> P[("Database: RoundResult Write\nscore, passed, agentTrace, feedback")]
    
    %% CUTOFF & TOURNAMENT BRANCH
    P --> Q{"Shortlisted Pool > Stage Cutoff?"}
    Q -->|No| R["Standard Stage Progression"]
    Q -->|Yes| S["Comparative Tournament Engine\n(Pairwise Head-to-Head Ranking)"]
    
    S --> T["Leaderboard Slicing\n(Top-N Shortlisted, Remaining Cut Off)"]
    T --> R
    
    %% STAGE ADVANCEMENT
    R --> U[("Database: Update Candidate\ncurrentRound = 1, status = SHORTLISTED / REJECTED")]
    
    %% NOTIFICATION
    U --> V["Outbound Email Dispatcher\n(mail_tasks / email-service.ts)"]
    V --> W{"Candidate Status"}
    W -->|SHORTLISTED| X["Interview Invitation with Next Round Link"]
    W -->|REJECTED| Y["Constructive Feedback with Missing Skills Report"]
    
    X --> Z[("Database: Update candidate.emailStatus\nSENT / FAILED")]
    Y --> Z

    %% MANUAL OVERRIDE
    Z -.-> OA["Human Recruiter Review"]
    OA -.->|Manual Override| OB["/api/candidates/:id/override\n(Status Change + Justification)"]
    OB -.->|Audit Write| OC[("Database: AuditLog Record\nisOverridden = true")]
```

---

## 3. Candidate Lifecycle & Round State Machine

```mermaid
stateDiagram-v2
    [*] --> Uploaded: Resumes Ingested
    Uploaded --> Pending: DB Candidate Record Created (currentRound = 0, status = PENDING)
    
    state "Round 0: Resume Shortlisting" as R0 {
        Pending --> EvaluatingR0: AI Screener Triggered
        EvaluatingR0 --> InReviewR0: Evaluation in progress (status = IN_REVIEW)
        InReviewR0 --> PassedR0: Score >= Cutoff Threshold
        InReviewR0 --> FailedR0: Score < Cutoff Threshold
        
        state "Comparative Tournament (If Pool > Cutoff)" as Tourn {
            PassedR0 --> TournamentQueue: Exceeds Stage Cutoff
            TournamentQueue --> PairwiseBattle: Head-to-Head Comparison
            PairwiseBattle --> RankedLeaderboard: Relative Win-Loss Ranking
            RankedLeaderboard --> TopCutoffShortlist: Ranked in Top N
            RankedLeaderboard --> DroppedCutoff: Ranked below Cutoff
        }
    }

    FailedR0 --> Rejected: status = REJECTED (Feedback Email Dispatched)
    DroppedCutoff --> Rejected: status = REJECTED
    
    PassedR0 --> ShortlistedR1: status = SHORTLISTED, currentRound = 1
    TopCutoffShortlist --> ShortlistedR1: status = SHORTLISTED, currentRound = 1

    state "Round 1: Aptitude & Reasoning" as R1 {
        ShortlistedR1 --> AssessingR1: Test Link Sent
        AssessingR1 --> PassedR1: Score >= Aptitude Threshold
        AssessingR1 --> FailedR1: Score < Aptitude Threshold
    }

    FailedR1 --> Rejected
    PassedR1 --> ShortlistedR2: currentRound = 2

    state "Round 2: Coding & DSA" as R2 {
        ShortlistedR2 --> SandboxingR2: Live DSA Sandbox
        SandboxingR2 --> PassedR2: All Test Cases Pass
        SandboxingR2 --> FailedR2: Test Cases Failed
    }

    FailedR2 --> Rejected
    PassedR2 --> ShortlistedR3: currentRound = 3

    state "Round 3: Communication" as R3 {
        ShortlistedR3 --> ReviewingR3: System Architecture Presentation
        ReviewingR3 --> PassedR3: Architecture Depth Approved
        ReviewingR3 --> FailedR3: Architectural Gaps
    }

    FailedR3 --> Rejected
    PassedR3 --> ShortlistedR4: currentRound = 4

    state "Round 4: HR Round" as R4 {
        ShortlistedR4 --> InterviewingR4: Culture & Compensation Review
        InterviewingR4 --> OfferExtended: Culture Fit Approved
        InterviewingR4 --> FailedR4: Mismatch
    }

    FailedR4 --> Rejected
    OfferExtended --> Hired: status = HIRED

    state "Human Recruiter Override" as Override {
        Rejected --> ManualReview: Recruiter Inspects Trace
        ManualReview --> OverriddenState: Justification Logged in AuditLog
    }

    OverriddenState --> ShortlistedR1: Re-instated to Stage
    OverriddenState --> ShortlistedR2
    OverriddenState --> ShortlistedR3
    OverriddenState --> ShortlistedR4
```

---

## 4. Hiring Round Visual Status Resolution Graph

```mermaid
flowchart TD
    In["Target Round (Order: idx) & Candidate Dataset"] --> Q1{"Explicit status in Round config JSON?\n(status !== 'auto')"}
    
    Q1 -->|Yes| DirectStatus["Apply Explicit Status: finished / running / failed / pending"]
    Q1 -->|No| Q2{"Is screening active on this stage?\n(screeningLoading == true)"}
    
    Q2 -->|Yes| S_RUNNING["Status: RUNNING\nColor: Amber / Warm Ochre\nCSS: var(--round-running-bg, #FEF3C7)\nText: var(--round-running-text, #92400E)\nAnimation: round-no-running (soft pulse)"]
    Q2 -->|No| Q3{"Has any candidate advanced past this round?\n(candidate.currentRound > idx)"}
    
    Q3 -->|Yes| S_FINISHED["Status: FINISHED\nColor: Sage / Emerald Green\nCSS: var(--round-finished-bg, #E8F5E9)\nText: var(--round-finished-text, #166534)\nBorder: 1px solid #C7EED8"]
    Q3 -->|No| Q4{"Are any candidates currently in this round?\n(candidate.currentRound == idx)"}
    
    Q4 -->|No| S_PENDING["Status: PENDING / NOT FINISHED\nColor: Current Theme Palette\nCSS: var(--round-pending-bg, var(--surface-purple))\nText: var(--round-pending-text, var(--primary-deep))\nBorder: Transparent"]
    Q4 -->|Yes| Q5{"Evaluate candidates in round idx"}
    
    Q5 -->|Any candidate status == 'IN_REVIEW'| S_RUNNING
    Q5 -->|Any candidate status == 'SHORTLISTED' or RoundResult.passed == true| S_FINISHED
    Q5 -->|All evaluated candidates rejected & none passed| S_FAILED["Status: FAILED\nColor: Soft Muted Rose / Wine Red\nCSS: var(--round-failed-bg, #FEE2E2)\nText: var(--round-failed-text, #991B1B)\nBorder: 1px solid #FECACA"]
    Q5 -->|All candidates still awaiting evaluation| S_PENDING
```

---

## 5. Distributed Worker & Queue Topology Graph

```mermaid
flowchart LR
    subgraph Producers["Task Producers"]
        API_NEXT["Next.js API Engine\n(Batch / Single Endpoints)"]
        API_FAST["FastAPI App\n(Background Endpoints)"]
    end

    subgraph Broker["Redis In-Memory Message Broker"]
        Q1["Queue: resume_screening"]
        Q2["Queue: scoring_tasks"]
        Q3["Queue: comparative_tasks"]
        Q4["Queue: mail_tasks"]
        Q_DLQ["Queue: dead_letter_queue"]
    end

    subgraph CeleryPool["Celery Distributed Workers"]
        W_RES["Worker: resume_tasks.py\n- Concurrency: 8\n- PDF/DOCX Parsing\n- Direct LLM Screening"]
        W_SCR["Worker: scoring_tasks.py\n- Concurrency: 4\n- Rubric Metric Calculation\n- Scoring Aggregation"]
        W_CMP["Worker: comparative_tasks.py\n- Concurrency: 2\n- Pairwise Tournament Brackets\n- Benchmark Ranking"]
        W_MAIL["Worker: mail_tasks.py\n- Concurrency: 2\n- SMTP Dispatch\n- FastMail Integration"]
        W_ERR["Worker: dead_letter.py\n- Error Telemetry\n- Retry Scheduling\n- Poison Pill Quarantine"]
    end

    subgraph Sinks["Persistence Sinks"]
        DB[(PostgreSQL / SQLite via Prisma & SQLAlchemy)]
        S3[(MinIO / S3 Document Blobs)]
    end

    API_NEXT -->|enqueue| Q1
    API_NEXT -->|enqueue| Q4
    API_FAST -->|enqueue| Q1
    API_FAST -->|enqueue| Q2
    API_FAST -->|enqueue| Q3
    API_FAST -->|enqueue| Q4

    Q1 --> W_RES
    Q2 --> W_SCR
    Q3 --> W_CMP
    Q4 --> W_MAIL

    W_RES -->|Task Max Retries Exceeded| Q_DLQ
    W_SCR -->|Task Max Retries Exceeded| Q_DLQ
    W_CMP -->|Task Max Retries Exceeded| Q_DLQ
    W_MAIL -->|Task Max Retries Exceeded| Q_DLQ
    Q_DLQ --> W_ERR

    W_RES --> DB
    W_RES --> S3
    W_SCR --> DB
    W_CMP --> DB
    W_MAIL --> DB
```

---

## 6. Core Database Entity-Relationship Graph

```mermaid
erDiagram
    User ||--o{ JobProfile : "creates"
    JobProfile ||--|{ PipelineRound : "defines (ordered 0..N)"
    JobProfile ||--o{ Candidate : "receives applications"
    Candidate ||--o{ RoundResult : "yields"
    PipelineRound ||--o{ RoundResult : "evaluates into"
    Candidate ||--o{ AuditLog : "tracks recruiter overrides"
    Candidate ||--o{ MailQueue : "queues emails"

    User {
        string id PK
        string email UK
        string name
        string role
        datetime createdAt
    }

    JobProfile {
        string id PK
        string title
        string description
        int minExperience
        int maxExperience
        string userId FK
        datetime createdAt
    }

    PipelineRound {
        string id PK
        string type "RESUME_SCREENING | APTITUDE | DSA | COMMUNICATION | HR_ROUND | CUSTOM"
        string title
        string description
        int order "0, 1, 2, 3, 4..."
        string config "JSON: cutoff, status, inputType, outputSpec"
        string jobProfileId FK
    }

    Candidate {
        string id PK
        string name
        string email UK
        string phone
        int experienceYears
        string resumeText
        string skills
        string status "PENDING | IN_REVIEW | SHORTLISTED | REJECTED | HIRED"
        int currentRound "0, 1, 2, 3, 4"
        string personalizedReply
        boolean isOverridden
        string overrideReason
        string emailStatus "NOT_SENT | SENT | FAILED"
        datetime emailSentAt
        string emailError
        string jobProfileId FK
        datetime createdAt
    }

    RoundResult {
        string id PK
        string candidateId FK
        string pipelineRoundId FK
        float score "0.0 - 100.0"
        boolean passed
        string agentTrace "JSON: strengths, red_flags, rubric_breakdown"
        string feedback
        datetime createdAt
    }

    AuditLog {
        string id PK
        string candidateId FK
        string changedBy
        string previousStatus
        string newStatus
        string reason
        datetime timestamp
    }

    MailQueue {
        string id PK
        string candidateId FK
        string recipient
        string subject
        string body
        string status "PENDING | SENT | FAILED"
        int attempts
        datetime scheduledAt
    }
```
