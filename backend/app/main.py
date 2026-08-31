from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from sqlalchemy import text
from app.api.router import api_router
from app.config import settings
from app.database import async_engine
from app.middleware.rate_limit import RateLimitMiddleware
from app.models.base import Base
from app.observability.logging import setup_logging
from app.observability.tracing import setup_tracing


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: configure logging and tracing
    setup_logging(debug=settings.DEBUG)
    setup_tracing()

    # Create tables if not existing (especially useful for sqlite/dev)
    try:
        async with async_engine.begin() as conn:
            # Enable pgvector if postgresql
            if "postgresql" in settings.get_async_database_url:
                try:
                    await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
                except Exception:
                    pass
            await conn.run_sync(Base.metadata.create_all)
    except Exception:
        pass

    yield

    # Shutdown: dispose DB connections
    await async_engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Production Python backend for TalentBench recruiter screening and benchmarking platform",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate Limit Middleware
app.add_middleware(RateLimitMiddleware)

# Mount API Routers
app.include_router(api_router, prefix="/api/v1")
app.include_router(api_router, prefix="/api")


@app.get("/health", tags=["Health"])
async def health_check():
    db_status = "healthy"
    try:
        async with async_engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "service": "talentbench-backend",
        "version": settings.VERSION,
        "database": db_status,
        "environment": settings.ENVIRONMENT,
    }


@app.get("/metrics", tags=["Observability"])
async def metrics():
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.get("/", include_in_schema=False)
async def root():
    return {
        "service": "TalentBench API",
        "version": settings.VERSION,
        "docs": "/docs",
        "health": "/health",
    }
