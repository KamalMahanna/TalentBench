from app.config import settings
from app.llm.cache import LLMCache
from app.llm.gateway import EvalResponse, LLMGateway, LLMResponse, ScreenResult
from app.llm.providers.gemini_provider import LangChainGeminiProvider
from app.llm.providers.groq_provider import LangChainGroqProvider
from app.llm.providers.mock import MockLLMProvider
from app.llm.providers.omniroute_provider import LangChainOmniRouteProvider
from app.llm.rate_limiter import GeminiRateLimiter, GroqRateLimiter

_gateway_instance: LLMGateway | None = None


def get_llm_gateway(reload: bool = False) -> LLMGateway:
    global _gateway_instance
    if _gateway_instance is None or reload:
        provider = settings.LLM_PROVIDER.lower()
        if provider in ("gemini", "google", "langchain_gemini"):
            _gateway_instance = LangChainGeminiProvider(
                api_key=settings.GEMINI_API_KEY,
                gemma_model=settings.GEMMA_MODEL,
                flash_lite_model=settings.GEMINI_FLASH_LITE_MODEL,
                token_threshold=settings.GEMINI_TOKEN_THRESHOLD,
                timeout=settings.GEMINI_TIMEOUT,
                max_retries=settings.GEMINI_MAX_RETRIES,
            )
        elif provider in ("omniroute", "langchain_omniroute"):
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
            # Fall back to Gemini if key configured, then OmniRoute, then Groq
            if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "test-key":
                _gateway_instance = LangChainGeminiProvider(
                    api_key=settings.GEMINI_API_KEY,
                    gemma_model=settings.GEMMA_MODEL,
                    flash_lite_model=settings.GEMINI_FLASH_LITE_MODEL,
                    token_threshold=settings.GEMINI_TOKEN_THRESHOLD,
                    timeout=settings.GEMINI_TIMEOUT,
                    max_retries=settings.GEMINI_MAX_RETRIES,
                )
            elif (
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
    "GeminiRateLimiter",
    "LangChainGroqProvider",
    "LangChainOmniRouteProvider",
    "LangChainGeminiProvider",
    "MockLLMProvider",
    "get_llm_gateway",
]
