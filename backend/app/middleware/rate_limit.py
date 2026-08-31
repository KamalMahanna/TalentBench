import time
from fastapi import HTTPException, Request, Response, status
import redis.asyncio as aioredis
from starlette.middleware.base import BaseHTTPMiddleware
from app.config import settings


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, redis_client: aioredis.Redis | None = None):
        super().__init__(app)
        self._redis = redis_client

    async def _get_redis(self) -> aioredis.Redis:
        if self._redis is None:
            self._redis = aioredis.from_url(
                settings.get_redis_url, decode_responses=True
            )
        return self._redis

    async def dispatch(self, request: Request, call_next):
        # Skip rate limit on docs, health, metrics, static paths
        path = request.url.path
        if (
            path in ["/docs", "/openapi.json", "/redoc", "/health", "/metrics"]
            or path.startswith("/static")
            or request.method == "OPTIONS"
        ):
            return await call_next(request)

        # Identify client (by Authorization header / IP)
        client_id = request.headers.get(
            "Authorization", request.client.host if request.client else "anonymous"
        )
        clean_key = f"rate_limit:{path}:{client_id[-16:]}"

        current_window = int(time.time() // 60)
        window_key = f"{clean_key}:{current_window}"

        try:
            r = await self._get_redis()
            current_count = await r.incr(window_key)
            if current_count == 1:
                await r.expire(window_key, 70)  # slightly more than 60s

            limit = settings.RATE_LIMIT_PER_MINUTE_ENDPOINT_DEFAULT
            if "upload" in path:
                limit = settings.RATE_LIMIT_PER_MINUTE_UPLOAD

            if current_count > limit:
                return Response(
                    content='{"error": "Too Many Requests", "message": "Rate limit exceeded. Please retry in a moment."}',
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    media_type="application/json",
                    headers={"Retry-After": "60"},
                )
        except Exception:
            # Degrade gracefully if redis is temporarily unreachable
            pass

        return await call_next(request)
