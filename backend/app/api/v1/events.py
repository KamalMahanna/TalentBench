import asyncio
import json
from collections.abc import AsyncGenerator
from fastapi import APIRouter, Request
import redis.asyncio as aioredis
from sse_starlette.sse import EventSourceResponse
from app.config import settings

router = APIRouter(tags=["Live Events"])


@router.get("/roles/{role_id}/events")
@router.get("/events/{role_id}", include_in_schema=False)
async def subscribe_role_events(role_id: str, request: Request):
    """
    Server-Sent Events endpoint streaming real-time live events for a role.
    """

    async def event_generator() -> AsyncGenerator[dict, None]:
        r = None
        pubsub = None
        channel_name = f"talentbench:events:{role_id}"

        try:
            r = aioredis.from_url(
                settings.get_redis_url,
                decode_responses=True,
                socket_connect_timeout=0.5,
                socket_timeout=0.5,
            )
            pubsub = r.pubsub()
            await pubsub.subscribe(channel_name)
        except Exception:
            pubsub = None

        yield {
            "event": "message",
            "data": json.dumps(
                {
                    "type": "candidate_status",
                    "payload": {
                        "role_id": role_id,
                        "message": "Connected to real-time screening stream",
                    },
                }
            ),
        }

        try:
            while True:
                if await request.is_disconnected():
                    break

                if pubsub:
                    try:
                        message = await pubsub.get_message(
                            ignore_subscribe_messages=True, timeout=1.0
                        )
                        if message and message["type"] == "message":
                            yield {
                                "event": "message",
                                "data": message["data"],
                            }
                        else:
                            await asyncio.sleep(0.5)
                    except Exception:
                        await asyncio.sleep(1.0)
                else:
                    await asyncio.sleep(2.0)

        except asyncio.CancelledError:
            pass
        finally:
            if pubsub:
                try:
                    await pubsub.unsubscribe(channel_name)
                    await pubsub.close()
                except Exception:
                    pass
            if r:
                try:
                    await r.close()
                except Exception:
                    pass

    return EventSourceResponse(event_generator())
