import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.llm import get_llm_gateway

RAW_JD_WITH_FLUFF = """
# Senior Backend Engineer at Acme Corp

About Us:
Acme Corp was founded in 2012 with a mission to revolutionize widget logistics. We are a family-oriented company that values diversity, ping-pong tournaments, free Friday lunches, artisanal kombucha on tap, and unlimited vacation days. We offer comprehensive medical, dental, and 401(k) matching.

Acme Corp is an Equal Opportunity Employer. All qualified applicants will receive consideration for employment without regard to race, color, religion, sex, or national origin.

Requirements:
- 5+ years of professional full-time experience in backend engineering.
- Proficient in Python, FastAPI, and PostgreSQL.
- Experience with Redis and Celery for async task queues.
- Hands-on experience with Docker and Kubernetes.

Responsibilities:
- Architect high-throughput distributed microservices.
- Optimize database schemas and write high-performance SQL queries.
- Participate in on-call rotation and improve system observability.
"""

@pytest.mark.asyncio
async def test_polish_jd_endpoint_strips_fluff():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/v1/roles/polish-jd", json={"text": RAW_JD_WITH_FLUFF})
        assert res.status_code == 200
        body = res.json()
        assert "data" in body
        data = body["data"]
        polished = data["polished_text"]
        
        # Fluff should be excluded
        assert "artisanal kombucha" not in polished.lower()
        assert "ping-pong" not in polished.lower()
        assert "equal opportunity employer" not in polished.lower()

        # Core requirements must be present
        assert "python" in polished.lower()
        assert "fastapi" in polished.lower() or "backend" in polished.lower()
        assert data["original_char_count"] > 0
        assert data["polished_char_count"] > 0

@pytest.mark.asyncio
async def test_polish_jd_empty_rejection():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/v1/roles/polish-jd", json={"text": "   short  "})
        assert res.status_code == 400
