import asyncio
import pytest
from unittest.mock import AsyncMock, patch
from app.config import settings
from app.llm import get_llm_gateway
from app.llm.gateway import EvalResponse, LLMResponse, ScreenResult
from app.llm.providers.gemini_provider import (
    LangChainGeminiProvider,
    _clean_json_text,
    _format_model_tag,
)
from app.llm.rate_limiter import GeminiRateLimiter


def test_clean_json_text():
    plain = '{"score": 92, "verdict": "pass"}'
    assert _clean_json_text(plain) == plain

    fenced = '```json\n{"score": 88, "verdict": "pass"}\n```'
    assert _clean_json_text(fenced) == '{"score": 88, "verdict": "pass"}'

    conversational = 'Here is the result:\n{"score": 75}\nEnd of response.'
    assert _clean_json_text(conversational) == '{"score": 75}'


def test_format_model_tag():
    assert _format_model_tag("gemma-4-31b-it") == "google/gemma-4-31b-it"
    assert (
        _format_model_tag("google/gemini-3.5-flash-lite")
        == "google/gemini-3.5-flash-lite"
    )


def test_gemini_provider_token_routing():
    provider = LangChainGeminiProvider(
        token_threshold=12000,
        gemma_model="gemma-4-31b-it",
        flash_lite_model="gemini-3.5-flash-lite",
    )

    # 1. Short prompt (< 12,000 tokens) -> gemma-4-31b-it
    short_prompt = "Evaluate this candidate for senior backend engineer."
    model, tokens = provider.select_model_for_prompt(short_prompt)
    assert model == "gemma-4-31b-it"
    assert tokens < 12000

    # 2. Long prompt (>= 12,000 tokens) -> gemini-3.5-flash-lite
    # 12,000 tokens * 3.8 chars/token ~ 45,600 characters
    long_prompt = "x" * 50000
    model, tokens = provider.select_model_for_prompt(long_prompt)
    assert model == "gemini-3.5-flash-lite"
    assert tokens >= 12000


def test_gemini_rate_limiter_quotas():
    limiter = GeminiRateLimiter(
        gemma_rpm_limit=30,
        gemma_tpm_limit=16000,
        flash_lite_rpm_limit=15,
        flash_lite_tpm_limit=250000,
    )
    assert limiter.quotas["gemma"]["rpm"] == 30
    assert limiter.quotas["gemma"]["tpm"] == 16000
    assert limiter.quotas["flash_lite"]["rpm"] == 15
    assert limiter.quotas["flash_lite"]["tpm"] == 250000


def test_gemini_rate_limiter_retry_after_parsing():
    limiter = GeminiRateLimiter()

    assert (
        limiter.parse_retry_after("Rate limit reached. Please try again in 4.5s.")
        == 4.5
    )
    assert limiter.parse_retry_after("Quota exhausted. Try in 800ms.") == 0.8
    assert limiter.parse_retry_after("Error 429: retry after 12s please") == 12.0
    assert limiter.parse_retry_after("Normal server error") is None


@pytest.mark.asyncio
async def test_gemini_rate_limiter_acquire():
    limiter = GeminiRateLimiter(
        gemma_rpm_limit=30,
        gemma_tpm_limit=16000,
    )
    # Acquire for gemma
    await limiter.acquire("gemma-4-31b-it", estimated_tokens=100)
    assert len(limiter._timestamps["gemma"]) == 1
    assert len(limiter._token_logs["gemma"]) == 1
    assert limiter._token_logs["gemma"][0][1] == 100

    # Record actual tokens
    await limiter.record_actual_tokens(
        "gemma-4-31b-it", actual_tokens=150, estimated_tokens=100
    )
    assert limiter._token_logs["gemma"][0][1] == 150


@pytest.mark.asyncio
async def test_gemini_rate_limiter_backoff():
    limiter = GeminiRateLimiter(base_delay=0.01, max_delay=0.1)
    with patch("asyncio.sleep", AsyncMock()):
        delay = await limiter.handle_backoff(
            attempt=0, error="Rate limit 429: try again in 0.05s"
        )
        assert 0.05 <= delay <= 0.5


@pytest.mark.asyncio
async def test_gemini_provider_complete_fallback():
    provider = LangChainGeminiProvider(
        api_key="test-key",
        gemma_model="gemma-4-31b-it",
        flash_lite_model="gemini-3.5-flash-lite",
    )
    res = await provider.complete("Analyze candidate technical background.")
    assert isinstance(res, LLMResponse)
    assert "gemma-4-31b-it" in res.model
    assert len(res.text) > 0
    assert res.prompt_tokens > 0


@pytest.mark.asyncio
async def test_gemini_provider_screen_candidate():
    provider = LangChainGeminiProvider(
        api_key="test-key",
    )
    jd = "Seeking Senior Distributed Systems Engineer with 5+ years experience in Rust and Raft."
    resume = "Senior Staff Engineer with 7 years experience designing Raft consensus clusters."
    result = await provider.screen_candidate(
        jd_text=jd, resume_text=resume, candidate_name="Alice"
    )
    assert isinstance(result, ScreenResult)
    assert result.matched is True
    assert result.verdict == "yes"


@pytest.mark.asyncio
async def test_gemini_provider_evaluate():
    provider = LangChainGeminiProvider(
        api_key="test-key",
    )
    eval_res = await provider.evaluate(
        round_type="architecture_interview",
        rubric="Minimum passing score is 70",
        candidate_data={"name": "Alice", "experience": 7},
    )
    assert isinstance(eval_res, EvalResponse)
    assert 0 <= eval_res.score <= 100
    assert len(eval_res.strengths) > 0
    assert len(eval_res.improvement_areas) > 0


def test_get_llm_gateway_gemini_registration():
    with patch.object(settings, "LLM_PROVIDER", "gemini"):
        gw = get_llm_gateway(reload=True)
        assert isinstance(gw, LangChainGeminiProvider)
