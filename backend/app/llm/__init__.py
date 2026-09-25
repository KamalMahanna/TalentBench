from app.config import settings
from app.llm.cache import LLMCache
from app.llm.gateway import EvalResponse, LLMGateway, LLMResponse, ScreenResult
from app.llm.providers.gemini_provider import LangChainGeminiProvider
from app.llm.providers.groq_provider import LangChainGroqProvider
from app.llm.providers.mock import MockLLMProvider
from app.llm.rate_limiter import GeminiRateLimiter, GroqRateLimiter

_gateway_instance: LLMGateway | None = None


def get_llm_gateway(reload: bool = False) -> LLMGateway:
    global _gateway_instance
    if _gateway_instance is None or reload:
        provider = settings.LLM_PROVIDER.lower()
        if provider in ("gemini", "google", "langchain_gemini"):
            _gateway_instance = LangChainGeminiProvider(
                api_key=settings.GEMINI_API_KEY,
                model=getattr(settings, "GEMINI_MODEL", "gemini-3.5-flash-lite"),
                timeout=settings.GEMINI_TIMEOUT,
                max_retries=settings.GEMINI_MAX_RETRIES,
            )
        elif provider in ("groq", "langchain_groq"):
            _gateway_instance = LangChainGroqProvider(
                api_key=settings.GROQ_API_KEY,
                model=settings.GROQ_MODEL,
            )
        elif provider == "mock":
            _gateway_instance = MockLLMProvider()
        else:
            # Default solely to Google Gemini (gemini-3.5-flash-lite)
            _gateway_instance = LangChainGeminiProvider(
                api_key=settings.GEMINI_API_KEY,
                model=getattr(settings, "GEMINI_MODEL", "gemini-3.5-flash-lite"),
                timeout=settings.GEMINI_TIMEOUT,
                max_retries=settings.GEMINI_MAX_RETRIES,
            )
    return _gateway_instance


__all__ = [
    "LLMGateway",
    "LLMResponse",
    "EvalResponse",
    "ScreenResult",
    "LLMCache",
    "GroqRateLimiter",
    "GeminiRateLimiter",
    "LangChainGroqProvider",
    "LangChainGeminiProvider",
    "MockLLMProvider",
    "get_llm_gateway",
]
