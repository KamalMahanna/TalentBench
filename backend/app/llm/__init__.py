from app.config import settings
from app.llm.cache import LLMCache
from app.llm.gateway import EvalResponse, LLMGateway, LLMResponse, ScreenResult
from app.llm.providers.groq_provider import LangChainGroqProvider
from app.llm.providers.mock import MockLLMProvider
from app.llm.providers.omniroute_provider import LangChainOmniRouteProvider
from app.llm.rate_limiter import GroqRateLimiter

_gateway_instance: LLMGateway | None = None


def get_llm_gateway(reload: bool = False) -> LLMGateway:
    global _gateway_instance
    if _gateway_instance is None or reload:
        provider = settings.LLM_PROVIDER.lower()
        if provider in ("omniroute", "langchain_omniroute"):
            _gateway_instance = LangChainOmniRouteProvider(
                base_url=settings.OMNIROUTE_BASE_URL,
                api_key=settings.OMNIROUTE_API_KEY,
                model=settings.OMNIROUTE_MODEL,
                fallback_models=settings.OMNIROUTE_FALLBACK_MODELS,
                timeout=settings.OMNIROUTE_TIMEOUT,
                max_retries=settings.OMNIROUTE_MAX_RETRIES,
            )
        elif provider in ("groq", "langchain_groq"):
            _gateway_instance = LangChainGroqProvider(
                api_key=settings.GROQ_API_KEY,
                model=settings.GROQ_MODEL,
            )
        elif provider == "mock":
            _gateway_instance = MockLLMProvider()
        else:
            # Fall back to OmniRoute if key is configured, otherwise Groq
            if (
                settings.OMNIROUTE_API_KEY
                and settings.OMNIROUTE_API_KEY != "sk-omniroute-key"
            ):
                _gateway_instance = LangChainOmniRouteProvider(
                    base_url=settings.OMNIROUTE_BASE_URL,
                    api_key=settings.OMNIROUTE_API_KEY,
                    model=settings.OMNIROUTE_MODEL,
                    fallback_models=settings.OMNIROUTE_FALLBACK_MODELS,
                    timeout=settings.OMNIROUTE_TIMEOUT,
                    max_retries=settings.OMNIROUTE_MAX_RETRIES,
                )
            else:
                _gateway_instance = LangChainGroqProvider(
                    api_key=settings.GROQ_API_KEY,
                    model=settings.GROQ_MODEL,
                )
    return _gateway_instance


__all__ = [
    "LLMGateway",
    "LLMResponse",
    "EvalResponse",
    "ScreenResult",
    "LLMCache",
    "GroqRateLimiter",
    "LangChainGroqProvider",
    "LangChainOmniRouteProvider",
    "MockLLMProvider",
    "get_llm_gateway",
]
