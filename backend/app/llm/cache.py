import hashlib
import json
import redis.asyncio as aioredis
from app.config import settings


class LLMCache:
    def __init__(self, redis_client: aioredis.Redis | None = None):
        self._redis = redis_client
        self._enabled = settings.LLM_CACHE_ENABLED
        self._ttl = settings.LLM_CACHE_TTL_SECONDS

    async def _get_redis(self) -> aioredis.Redis:
        if self._redis is None:
            self._redis = aioredis.from_url(
                settings.get_redis_url, decode_responses=True
            )
        return self._redis

    def generate_key(self, prefix: str, prompt: str, **kwargs) -> str:
        # Normalize prompt and extra params
        normalized = prompt.strip().lower()
        param_str = json.dumps(kwargs, sort_keys=True)
        h = hashlib.sha256(f"{normalized}::{param_str}".encode("utf-8")).hexdigest()
        return f"talentbench:llm:{prefix}:{h}"

    async def get(self, key: str) -> dict | None:
        if not self._enabled:
            return None
        try:
            r = await self._get_redis()
            data = await r.get(key)
            if data:
                return json.loads(data)
        except Exception:
            pass
        return None

    async def set(self, key: str, value: dict, ttl: int | None = None) -> None:
        if not self._enabled:
            return
        try:
            r = await self._get_redis()
            await r.set(key, json.dumps(value), ex=ttl or self._ttl)
        except Exception:
            pass
