from app.config import settings
from app.llm.cache import LLMCache
from app.llm.gateway import EvalResponse, LLMGateway, LLMResponse
from app.llm.providers.mock import MockLLMProvider

_gateway_instance: LLMGateway | None = None


def get_llm_gateway() -> LLMGateway:
    global _gateway_instance
    if _gateway_instance is None:
        provider = settings.LLM_PROVIDER.lower()
        if provider == "mock":
            _gateway_instance = MockLLMProvider()
        else:
            # Fallback or initialize specific provider
            _gateway_instance = MockLLMProvider()
    return _gateway_instance


__all__ = [
    "LLMGateway",
    "LLMResponse",
    "EvalResponse",
    "LLMCache",
    "MockLLMProvider",
    "get_llm_gateway",
]
