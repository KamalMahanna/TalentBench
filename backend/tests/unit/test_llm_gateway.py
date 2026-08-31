import pytest
from app.llm import get_llm_gateway


@pytest.mark.asyncio
async def test_llm_complete_and_evaluate():
    llm = get_llm_gateway()
    res = await llm.complete("Evaluate candidate background.")
    assert len(res.text) > 0

    eval_res = await llm.evaluate(
        round_type="resume_screen",
        rubric="Cutoff: 60",
        candidate_data={
            "name": "Alice",
            "skills": ["Python", "AWS"],
            "experience_years": 5,
        },
    )
    assert 0 <= eval_res.score <= 100
    assert len(eval_res.verdict) > 0
    assert len(eval_res.strengths) > 0
    assert len(eval_res.improvement_areas) > 0


@pytest.mark.asyncio
async def test_llm_embed():
    llm = get_llm_gateway()
    emb = await llm.embed("Software Engineer with 5 years experience in Python")
    assert len(emb) == 1536


@pytest.mark.asyncio
async def test_llm_reduce_projects():
    llm = get_llm_gateway()
    projects = [
        "Distributed KV Store",
        "Realtime WebSocket Engine",
        "Analytics Pipeline",
        "Auth Gateway",
        "Logging Daemon",
    ]
    reduced = await llm.reduce_projects(projects, target_count=3)
    assert len(reduced) <= 3
