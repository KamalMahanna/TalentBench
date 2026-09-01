import asyncio
import json
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from app.config import settings
from app.llm import get_llm_gateway
from app.llm.gateway import EvalResponse, LLMResponse
from app.llm.providers.omniroute_provider import (
    LangChainOmniRouteProvider,
    _clean_json_text,
    _format_model_tag,
)


def test_clean_json_text():
    # 1. Plain JSON
    plain = '{"score": 90, "verdict": "pass"}'
    assert _clean_json_text(plain) == plain

    # 2. Markdown fenced code block
    fenced = '```json\n{"score": 85, "verdict": "pass"}\n```'
    assert json.loads(_clean_json_text(fenced)) == {"score": 85, "verdict": "pass"}

    # 3. Conversational preamble & postscript
    conversational = 'Here is your evaluation report:\n{"score": 78}\nHope this helps!'
    assert json.loads(_clean_json_text(conversational)) == {"score": 78}

    # 4. JSON Array
    array_fenced = '```json\n["proj1", "proj2"]\n```'
    assert json.loads(_clean_json_text(array_fenced)) == ["proj1", "proj2"]

    # 5. Empty text
    assert _clean_json_text("") == ""


def test_format_model_tag():
    assert _format_model_tag("kamalai") == "omniroute/kamalai"
    assert _format_model_tag("omniroute/kamalai") == "omniroute/kamalai"


def test_omniroute_provider_initialization():
    provider = LangChainOmniRouteProvider(
        base_url="http://localhost:20128/v1",
        api_key="test-key",
        model="kamalai",
        fallback_models=["kamalai", "gpt-4o", "claude-3-5-sonnet"],
    )
    assert provider.base_url == "http://localhost:20128/v1"
    assert provider.api_key == "test-key"
    assert provider.model_name == "kamalai"
    # Verify primary model is excluded from fallbacks
    assert "kamalai" not in provider.fallback_models
    assert provider.fallback_models == ["gpt-4o", "claude-3-5-sonnet"]


@pytest.mark.asyncio
async def test_omniroute_provider_complete_fallback():
    provider = LangChainOmniRouteProvider(
        base_url="http://localhost:20128/v1",
        api_key="sk-omniroute-key",
        model="kamalai",
    )
    # With dummy key and offline simulated call, fallback provides valid response
    with patch.object(
        provider, "_execute_with_omniroute_fallback", AsyncMock(return_value=None)
    ):
        res = await provider.complete(
            "Identify gaps in candidate concurrency experience."
        )
        assert isinstance(res, LLMResponse)
        assert len(res.text) > 0
        assert "omniroute/kamalai" in res.model
        assert res.prompt_tokens > 0
        assert res.completion_tokens > 0


@pytest.mark.asyncio
async def test_omniroute_provider_evaluate_fallback():
    provider = LangChainOmniRouteProvider(
        base_url="http://localhost:20128/v1",
        api_key="sk-omniroute-key",
        model="kamalai",
    )
    with patch.object(
        provider, "_execute_with_omniroute_fallback", AsyncMock(return_value=None)
    ):
        eval_res = await provider.evaluate(
            round_type="resume_screen",
            rubric="Cutoff: 60",
            candidate_data={"name": "Bob", "skills": ["Python", "Docker"]},
        )
        assert isinstance(eval_res, EvalResponse)
        assert 0 <= eval_res.score <= 100
        assert len(eval_res.verdict) > 0
        assert len(eval_res.strengths) > 0
        assert len(eval_res.improvement_areas) > 0
        assert "omniroute/kamalai" in eval_res.model_name


@pytest.mark.asyncio
async def test_omniroute_provider_embed():
    provider = LangChainOmniRouteProvider()
    vec = await provider.embed("Senior Distributed Systems Engineer")
    assert isinstance(vec, list)
    assert len(vec) == 1536
    # Should be normalized (norm close to 1)
    norm = sum(x * x for x in vec) ** 0.5
    assert 0.95 <= norm <= 1.05


@pytest.mark.asyncio
async def test_omniroute_provider_stream():
    provider = LangChainOmniRouteProvider()
    chunks = []
    async for chunk in provider.stream("Say hi"):
        chunks.append(chunk)
    streamed_text = "".join(chunks)
    assert len(streamed_text) > 0


@pytest.mark.asyncio
async def test_omniroute_provider_stream_fallback():
    provider = LangChainOmniRouteProvider()
    with patch.object(
        provider, "_get_client", side_effect=Exception("Connection offline")
    ):
        chunks = []
        async for chunk in provider.stream("Tell me about candidate"):
            chunks.append(chunk)
        streamed_text = "".join(chunks)
        assert len(streamed_text) > 0
        assert "OmniRoute" in streamed_text


@pytest.mark.asyncio
async def test_omniroute_provider_extract_and_reduce():
    provider = LangChainOmniRouteProvider()
    with patch.object(
        provider, "_execute_with_omniroute_fallback", AsyncMock(return_value=None)
    ):
        meta = await provider.extract_skills_and_projects("Resume text content...")
        assert "name" in meta
        assert "skills" in meta
        assert "projects" in meta

        reduced = await provider.reduce_projects(
            ["Proj 1", "Proj 2", "Proj 3", "Proj 4", "Proj 5"],
            target_count=2,
        )
        assert len(reduced) <= 2


@pytest.mark.asyncio
async def test_omniroute_provider_fallback_routing():
    provider = LangChainOmniRouteProvider(
        base_url="http://localhost:20128/v1",
        api_key="real-key",
        model="kamalai",
        fallback_models=["backup-model"],
    )
    calls = []

    async def flaky_call(model_name: str):
        calls.append(model_name)
        if model_name == "kamalai":
            raise Exception("Primary model rate limit")
        return f"Success with {model_name}"

    result = await provider._execute_with_omniroute_fallback(flaky_call)
    assert result == "Success with backup-model"
    assert calls == ["kamalai", "backup-model"]


def test_get_llm_gateway_wiring():
    # Test that get_llm_gateway returns LangChainOmniRouteProvider when LLM_PROVIDER="omniroute"
    with patch.object(settings, "LLM_PROVIDER", "omniroute"):
        gw = get_llm_gateway(reload=True)
        assert isinstance(gw, LangChainOmniRouteProvider)
