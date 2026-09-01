import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.llm.providers.mock import MockLLMProvider
from app.llm.gateway import ScreenResult


@pytest.mark.asyncio
async def test_mock_screen_candidate_pass():
    provider = MockLLMProvider(seed=42)
    jd = "Role: Senior Backend Engineer\nRequirements: 5 years experience in Python and PostgreSQL."
    resume = "Candidate: Alex\nExperience: 5 years full-time backend engineer.\nSkills: Python, PostgreSQL, Redis."
    res = await provider.screen_candidate(
        jd_text=jd, resume_text=resume, candidate_name="Alex"
    )
    assert res.matched is True
    assert res.verdict == "yes"


@pytest.mark.asyncio
async def test_mock_screen_candidate_fail_internship_only():
    provider = MockLLMProvider(seed=42)
    jd = "Role: Senior Backend Engineer\nRequirements: 5 years experience in Python."
    resume = "Candidate: Jordan\nExperience: Software Engineer Intern for 3 months.\nSkills: Python."
    res = await provider.screen_candidate(
        jd_text=jd, resume_text=resume, candidate_name="Jordan"
    )
    assert res.matched is False
    assert "internship" in res.verdict.lower()
    assert "full-time" in res.verdict.lower()


@pytest.mark.asyncio
async def test_mock_screen_candidate_fail_skills():
    provider = MockLLMProvider(seed=42)
    jd = "Role: Senior Backend Engineer\nRequirements: Python, PostgreSQL, Cloud."
    resume = "Candidate: Taylor\nExperience: 5 years graphic design.\nSkills: Photoshop, Figma, Illustrator."
    res = await provider.screen_candidate(
        jd_text=jd, resume_text=resume, candidate_name="Taylor"
    )
    assert res.matched is False
    assert len(res.verdict) > 10


@pytest.mark.asyncio
async def test_screen_text_api_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "jd_text": "Role: Backend Engineer\nRequirements: 3 years experience with Python.",
            "resume_text": "Candidate: Morgan\nExperience: 4 years full-time software developer.\nSkills: Python, Docker.",
            "candidate_name": "Morgan",
        }
        res = await client.post("/api/v1/roles/screen-text", json=payload)
        assert res.status_code == 200
        data = res.json()["data"]
        assert "matched" in data
        assert "verdict" in data


@pytest.mark.asyncio
async def test_omniroute_screen_candidate_match():
    from app.llm.providers.omniroute_provider import LangChainOmniRouteProvider
    from app.config import settings

    provider = LangChainOmniRouteProvider(
        base_url=settings.OMNIROUTE_BASE_URL,
        api_key=settings.OMNIROUTE_API_KEY,
        model=settings.OMNIROUTE_MODEL,
    )
    jd = "Role: Senior Backend Engineer\nRequirements: 5 years experience in Python and PostgreSQL."
    resume = "Candidate: Bob Smith\nExperience: 5 years full-time Senior Backend Engineer at TechCorp.\nSkills: Python, PostgreSQL, AWS, Git.\nProjects: Distributed payment system."
    res = await provider.screen_candidate(
        jd_text=jd, resume_text=resume, candidate_name="Bob Smith"
    )
    assert res.matched is True
    assert res.verdict == "yes"


@pytest.mark.asyncio
async def test_omniroute_screen_candidate_internship_rejection():
    from app.llm.providers.omniroute_provider import LangChainOmniRouteProvider
    from app.config import settings

    provider = LangChainOmniRouteProvider(
        base_url=settings.OMNIROUTE_BASE_URL,
        api_key=settings.OMNIROUTE_API_KEY,
        model=settings.OMNIROUTE_MODEL,
    )
    jd = "Role: Senior Backend Engineer\nRequirements: Minimum 5 years of full-time professional backend engineering experience. Proficient in Python, PostgreSQL, and distributed systems."
    resume = "Candidate: Jane Doe\nExperience: 1 year full-time Backend Developer at Acme Corp. Previously 6-month Software Engineering Intern.\nSkills: Python, Django, PostgreSQL, Docker.\nProjects: Built scalable microservice."
    res = await provider.screen_candidate(
        jd_text=jd, resume_text=resume, candidate_name="Jane Doe"
    )
    assert res.matched is False
    assert res.verdict != "yes"
    assert "experience" in res.verdict.lower()
