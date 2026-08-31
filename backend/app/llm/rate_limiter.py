import asyncio
import math
import random
import re
import time
from collections import deque
import redis.asyncio as aioredis
import structlog
from app.config import settings

logger = structlog.get_logger()


class GroqRateLimiter:
    """
    Advanced proactive and reactive rate limiter for Groq API with qwen/qwen3.8-27b:
    Quotas:
      - Requests: 30 / minute, 1,000 / day
      - Tokens: 8,000 / minute, 200,000 / day
    """

    def __init__(
        self,
        rpm_limit: int = 30,
        rpd_limit: int = 1000,
        tpm_limit: int = 8000,
        tpd_limit: int = 200000,
        max_retries: int = 5,
        base_delay: float = 2.0,
        max_delay: float = 60.0,
    ):
        self.rpm_limit = rpm_limit
        self.rpd_limit = rpd_limit
        self.tpm_limit = tpm_limit
        self.tpd_limit = tpd_limit
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay

        # In-memory sliding window fallbacks
        self._request_timestamps_min: deque[float] = deque()
        self._request_timestamps_day: deque[float] = deque()
        self._token_log_min: deque[tuple[float, int]] = deque()
        self._token_log_day: deque[tuple[float, int]] = deque()
        self._lock = asyncio.Lock()
        self._redis_client: aioredis.Redis | None = None

    async def _get_redis(self) -> aioredis.Redis | None:
        if self._redis_client is None:
            try:
                self._redis_client = aioredis.from_url(
                    settings.get_redis_url,
                    decode_responses=True,
                    socket_connect_timeout=0.5,
                    socket_timeout=0.5,
                )
                await self._redis_client.ping()
            except Exception:
                self._redis_client = None
        return self._redis_client

    async def acquire(self, estimated_tokens: int = 400) -> None:
        """
        Proactively throttle calls before sending to Groq to respect RPM, RPD, TPM, TPD.
        """
        async with self._lock:
            while True:
                now = time.time()
                r = await self._get_redis()

                if r:
                    # Redis sliding window logic
                    try:
                        current_min_key = f"groq:rpm:{int(now // 60)}"
                        current_day_key = f"groq:rpd:{int(now // 86400)}"
                        current_tpm_key = f"groq:tpm:{int(now // 60)}"
                        current_tpd_key = f"groq:tpd:{int(now // 86400)}"

                        pipe = r.pipeline()
                        pipe.get(current_min_key)
                        pipe.get(current_day_key)
                        pipe.get(current_tpm_key)
                        pipe.get(current_tpd_key)
                        rpm_val, rpd_val, tpm_val, tpd_val = await pipe.execute()

                        rpm = int(rpm_val or 0)
                        rpd = int(rpd_val or 0)
                        tpm = int(tpm_val or 0)
                        tpd = int(tpd_val or 0)

                        # Check limits
                        wait_seconds = 0.0
                        if rpm >= self.rpm_limit:
                            wait_seconds = max(wait_seconds, 60.0 - (now % 60) + 0.1)
                        if tpm + estimated_tokens >= self.tpm_limit:
                            wait_seconds = max(wait_seconds, 60.0 - (now % 60) + 0.1)
                        if rpd >= self.rpd_limit:
                            wait_seconds = max(
                                wait_seconds, 86400.0 - (now % 86400) + 1.0
                            )
                        if tpd + estimated_tokens >= self.tpd_limit:
                            wait_seconds = max(
                                wait_seconds, 86400.0 - (now % 86400) + 1.0
                            )

                        if wait_seconds > 0:
                            logger.info(
                                "groq_rate_limit_throttle_wait",
                                wait_seconds=round(wait_seconds, 2),
                            )
                            await asyncio.sleep(min(wait_seconds, 5.0))
                            continue

                        # Increment reservation
                        pipe = r.pipeline()
                        pipe.incr(current_min_key)
                        pipe.expire(current_min_key, 70)
                        pipe.incr(current_day_key)
                        pipe.expire(current_day_key, 90000)
                        pipe.incrby(current_tpm_key, estimated_tokens)
                        pipe.expire(current_tpm_key, 70)
                        pipe.incrby(current_tpd_key, estimated_tokens)
                        pipe.expire(current_tpd_key, 90000)
                        await pipe.execute()
                        break
                    except Exception:
                        pass

                # In-memory sliding window fallback
                # Clean entries older than 60s and 86400s
                while (
                    self._request_timestamps_min
                    and now - self._request_timestamps_min[0] > 60.0
                ):
                    self._request_timestamps_min.popleft()
                while (
                    self._request_timestamps_day
                    and now - self._request_timestamps_day[0] > 86400.0
                ):
                    self._request_timestamps_day.popleft()
                while self._token_log_min and now - self._token_log_min[0][0] > 60.0:
                    self._token_log_min.popleft()
                while self._token_log_day and now - self._token_log_day[0][0] > 86400.0:
                    self._token_log_day.popleft()

                curr_tpm = sum(t[1] for t in self._token_log_min)
                curr_tpd = sum(t[1] for t in self._token_log_day)

                wait_sec = 0.0
                if len(self._request_timestamps_min) >= self.rpm_limit:
                    oldest = self._request_timestamps_min[0]
                    wait_sec = max(wait_sec, 60.0 - (now - oldest) + 0.05)
                if (
                    curr_tpm + estimated_tokens >= self.tpm_limit
                    and self._token_log_min
                ):
                    oldest = self._token_log_min[0][0]
                    wait_sec = max(wait_sec, 60.0 - (now - oldest) + 0.05)

                if wait_sec > 0:
                    logger.info(
                        "groq_in_memory_throttle_wait", wait_seconds=round(wait_sec, 2)
                    )
                    await asyncio.sleep(wait_sec)
                    continue

                # Register in-memory slot
                self._request_timestamps_min.append(now)
                self._request_timestamps_day.append(now)
                self._token_log_min.append((now, estimated_tokens))
                self._token_log_day.append((now, estimated_tokens))
                break

    async def record_actual_tokens(
        self, total_tokens: int, estimated_tokens: int = 400
    ) -> None:
        """Adjust token count with actual tokens reported by Groq response."""
        diff = total_tokens - estimated_tokens
        if diff == 0:
            return

        r = await self._get_redis()
        if r:
            try:
                now = time.time()
                current_tpm_key = f"groq:tpm:{int(now // 60)}"
                current_tpd_key = f"groq:tpd:{int(now // 86400)}"
                pipe = r.pipeline()
                if diff > 0:
                    pipe.incrby(current_tpm_key, diff)
                    pipe.incrby(current_tpd_key, diff)
                else:
                    pipe.decrby(current_tpm_key, abs(diff))
                    pipe.decrby(current_tpd_key, abs(diff))
                await pipe.execute()
            except Exception:
                pass

    def parse_retry_after(self, error_message: str) -> float | None:
        """Parse retry-after seconds from Groq error message or headers."""
        # e.g., "Please try again in 2.34s" or "try again in 12s" or "Rate limit reached. Try in 500ms"
        try:
            m = re.search(r"try again in ([\d\.]+)m?s", error_message, re.IGNORECASE)
            if m:
                val = float(m.group(1))
                if "ms" in m.group(0).lower():
                    return val / 1000.0
                return val
            m2 = re.search(r"retry after ([\d\.]+)s", error_message, re.IGNORECASE)
            if m2:
                return float(m2.group(1))
        except Exception:
            pass
        return None

    async def handle_backoff(self, attempt: int, error: Exception | str) -> None:
        """Exponential backoff with jitter and retry-after parsing on 429 / API errors."""
        err_str = str(error)
        parsed_wait = self.parse_retry_after(err_str)

        if parsed_wait is not None:
            delay = min(self.max_delay, parsed_wait + random.uniform(0.1, 0.5))
        else:
            delay = min(
                self.max_delay,
                (self.base_delay * (2**attempt)) + random.uniform(0.2, 0.8),
            )

        logger.warning(
            "groq_rate_limit_backoff",
            attempt=attempt + 1,
            delay_seconds=round(delay, 2),
            error=err_str[:150],
        )
        await asyncio.sleep(delay)
