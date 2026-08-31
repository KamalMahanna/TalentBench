from prometheus_client import Counter, Gauge, Histogram

# Prometheus Metrics for TalentBench Production Backend
REQUEST_COUNT = Counter(
    "talentbench_http_requests_total",
    "Total HTTP requests received",
    ["method", "endpoint", "status_code"],
)

REQUEST_LATENCY = Histogram(
    "talentbench_http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "endpoint"],
)

CANDIDATES_PROCESSED = Counter(
    "talentbench_candidates_processed_total",
    "Total number of candidate resumes screened",
    ["role_id", "status"],
)

LLM_CALL_DURATION = Histogram(
    "talentbench_llm_call_duration_seconds",
    "Duration of LLM calls in seconds",
    ["provider", "operation"],
)

MAIL_SENT_TOTAL = Counter(
    "talentbench_mail_sent_total",
    "Total emails queued and sent",
    ["mail_type", "status"],
)

QUEUE_DEPTH = Gauge(
    "talentbench_task_queue_depth",
    "Current task queue depth",
    ["queue_name"],
)

DLQ_SIZE = Gauge(
    "talentbench_dlq_size",
    "Number of jobs in dead-letter state needing recruiter attention",
    ["role_id"],
)
