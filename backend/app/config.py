import os
from typing import Any, Literal
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # App
    PROJECT_NAME: str = "TalentBench API"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "*"
    ]

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug(cls, v: Any) -> bool:
        if isinstance(v, bool):
            return v
        if isinstance(v, str):
            return v.lower() in ("true", "1", "yes", "debug", "dev")
        return bool(v)

    # Security & Auth
    SECRET_KEY: str = "talentbench-super-secret-key-change-in-production-min-32-chars-long"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    AUTH_STRATEGY: Literal["bearer", "cookie"] = "bearer"

    # Database
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "talentbench"
    DATABASE_URL: str | None = None
    ASYNC_DATABASE_URL: str | None = None

    @property
    def sync_database_url(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    @property
    def get_async_database_url(self) -> str:
        if self.ASYNC_DATABASE_URL:
            return self.ASYNC_DATABASE_URL
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    # Redis & Caching
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: str | None = None
    REDIS_URL: str | None = None

    @property
    def get_redis_url(self) -> str:
        if self.REDIS_URL:
            return self.REDIS_URL
        if self.REDIS_PASSWORD:
            return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"

    # Celery
    CELERY_BROKER_URL: str | None = None
    CELERY_RESULT_BACKEND: str | None = None

    @property
    def get_celery_broker_url(self) -> str:
        return self.CELERY_BROKER_URL or self.get_redis_url

    @property
    def get_celery_result_backend(self) -> str:
        return self.CELERY_RESULT_BACKEND or self.get_redis_url

    # Object Storage (S3 / MinIO)
    S3_ENDPOINT_URL: str | None = "http://localhost:9000"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_BUCKET_RESUMES: str = "talentbench-resumes"
    S3_BUCKET_EXPORTS: str = "talentbench-exports"
    S3_REGION: str = "us-east-1"
    S3_USE_SSL: bool = False

    # LLM Configuration
    LLM_PROVIDER: str = "groq"  # "groq", "mock", "openai", "anthropic", "gemini"
    GROQ_API_KEY: str | None = None
    GROQ_MODEL: str = "qwen/qwen3.8-27b"
    GROQ_RPM_LIMIT: int = 30           # 30 requests / minute
    GROQ_RPD_LIMIT: int = 1000         # 1K requests / day
    GROQ_TPM_LIMIT: int = 8000         # 8K tokens / minute
    GROQ_TPD_LIMIT: int = 200000       # 200K tokens / day
    GROQ_MAX_RETRIES: int = 5
    GROQ_RETRY_BASE_DELAY: float = 2.0
    GROQ_RETRY_MAX_DELAY: float = 60.0

    OPENAI_API_KEY: str | None = None
    ANTHROPIC_API_KEY: str | None = None
    GEMINI_API_KEY: str | None = None
    LLM_MODEL: str = "qwen/qwen3.8-27b"
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIMENSION: int = 1536
    LLM_CACHE_ENABLED: bool = True
    LLM_CACHE_TTL_SECONDS: int = 86400 * 7  # 7 days

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE_ORG: int = 1200
    RATE_LIMIT_PER_MINUTE_ENDPOINT_DEFAULT: int = 300
    RATE_LIMIT_PER_MINUTE_UPLOAD: int = 30
    RATE_LIMIT_PER_MINUTE_LLM: int = 60

    # Mail
    MAIL_PROVIDER: str = "mock"
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 1025
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    FROM_EMAIL: str = "noreply@talentbench.io"
    FROM_NAME: str = "TalentBench Recruitment Team"

    # Observability
    OTEL_EXPORTER_OTLP_ENDPOINT: str | None = None
    PROMETHEUS_METRICS_ENABLED: bool = True


settings = Settings()
