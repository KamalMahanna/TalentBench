from app.config import settings
from app.llm.cache import LLMCache
from app.llm.gateway import EvalResponse, LLMGateway, LLMResponse
from app.llm.providers.groq_provider import LangChainGroqProvider
from app.llm.providers.mock import MockLLMProvider
from app.llm.rate_limiter import GroqRateLimiter

_gateway_instance: LLMGateway | None = None


def get_llm_gateway() -> LLMGateway:
    global _gateway_instance
    if _gateway_instance is None:
        provider = settings.LLM_PROVIDER.lower()
        if provider == "groq" or provider == "langchain_groq":
            _gateway_instance = LangChainGroqProvider(
                api_key=settings.GROQ_API_KEY,
                model=settings.GROQ_MODEL,
            )
        elif provider == "mock":
            _gateway_instance = MockLLMProvider()
        else:
            # Default to Groq Provider
            _gateway_instance = LangChainGroqProvider(
                api_key=settings.GROQ_API_KEY,
                model=settings.GROQ_MODEL,
            )
    return _gateway_instance


__all__ = [
    "LLMGateway",
    "LLMResponse",
    "EvalResponse",
    "LLMCache",
    "GroqRateLimiter",
    "LangChainGroqProvider",
    "MockLLMProvider",
    "get_llm_gateway",
]
