import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from app.llm.providers.groq_provider import LangChainGroqProvider
from app.llm.rate_limiter import GroqRateLimiter


@pytest.mark.asyncio
async def test_groq_rate_limiter_rpm_and_tpm_acquire():
    # Setup rate limiter with tight limits for unit testing
    limiter = GroqRateLimiter(
        rpm_limit=3,
        rpd_limit=100,
        tpm_limit=500,
        tpd_limit=10000,
        base_delay=0.01,
        max_delay=0.1,
    )

    # 3 acquires should succeed immediately
    await limiter.acquire(estimated_tokens=100)
    await limiter.acquire(estimated_tokens=100)
    await limiter.acquire(estimated_tokens=100)

    assert len(limiter._request_timestamps_min) == 3


def test_groq_rate_limiter_parse_retry_after():
    limiter = GroqRateLimiter()

    # Pattern: "Please try again in 2.34s"
    msg1 = "Rate limit reached. Please try again in 3.5s"
    assert limiter.parse_retry_after(msg1) == 3.5

    # Pattern: "try again in 500ms"
    msg2 = "Error 429: Rate limit exceeded, try again in 500ms"
    assert limiter.parse_retry_after(msg2) == 0.5

    # Pattern: "retry after 12s"
    msg3 = "Quota exhausted, retry after 12.0s"
    assert limiter.parse_retry_after(msg3) == 12.0


@pytest.mark.asyncio
async def test_groq_rate_limiter_backoff():
    limiter = GroqRateLimiter(base_delay=0.01, max_delay=0.05)
    # Ensure handle_backoff runs without throwing
    await limiter.handle_backoff(attempt=0, error="Please try again in 10ms")
    await limiter.handle_backoff(attempt=1, error="Generic 429 Rate Limit")


@pytest.mark.asyncio
async def test_langchain_groq_provider_complete_and_evaluate():
    provider = LangChainGroqProvider(
        api_key="mock-groq-key",
        model="qwen/qwen3.8-27b",
    )
    assert provider.model_name == "qwen/qwen3.8-27b"

    # Complete
    res = await provider.complete("Candidate evaluation prompt")
    assert len(res.text) > 0
    assert res.model == "qwen/qwen3.8-27b"

    # Evaluate
    eval_res = await provider.evaluate(
        round_type="resume_screen",
        rubric="Cutoff 60",
        candidate_data={"name": "Alex", "skills": ["Python", "FastAPI"]},
    )
    assert 0 <= eval_res.score <= 100
    assert len(eval_res.verdict) > 0
    assert eval_res.model_name == "qwen/qwen3.8-27b"


@pytest.mark.asyncio
async def test_langchain_groq_provider_auto_retry_on_429():
    provider = LangChainGroqProvider(
        api_key="mock-groq-key",
        model="qwen/qwen3.8-27b",
    )

    call_count = 0

    async def flaky_call():
        nonlocal call_count
        call_count += 1
        if call_count < 3:
            raise Exception("Rate limit exceeded: Please try again in 5ms")
        return "Success on attempt 3"

    # Should catch 429, backoff, and succeed on attempt 3
    result = await provider._execute_with_retry(flaky_call, estimated_tokens=100)
    assert result == "Success on attempt 3"
    assert call_count == 3
