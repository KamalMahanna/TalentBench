import asyncio
from collections.abc import AsyncGenerator
from unittest.mock import MagicMock
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.config import settings
from app.database import get_db
from app.main import app
from app.models.base import Base
from app.workers.resume_tasks import (
    process_batch_resumes,
    process_single_candidate_resume,
)

# Mock Celery delay during test runs so tasks don't block on real broker
process_batch_resumes.delay = MagicMock(return_value=MagicMock(id="mock-task-id"))
process_single_candidate_resume.delay = MagicMock(
    return_value=MagicMock(id="mock-task-id")
)

# Use SQLite in-memory with async driver for unit & integration testing
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

TestSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(autouse=True)
async def setup_test_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with TestSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def auth_headers(client: AsyncClient) -> dict[str, str]:
    res = await client.post(
        "/api/v1/auth/signup",
        json={
            "email": "test.recruiter@talentbench.io",
            "name": "Test Recruiter",
            "orgName": "Test Org",
        },
    )
    data = res.json()["data"]
    token = data["token"]
    return {"Authorization": f"Bearer {token}"}
