import asyncio
import redis
from sqlalchemy import select, delete
from app.database import AsyncSessionLocal
from app.models import (
    Candidate,
    Role,
    Round,
    RoundResult,
    BenchmarkProfile,
    MailQueue,
)
from app.config import settings


async def reset_mock():
    print("🔄 Resetting Data Analyst - Mock to initial pre-execution state...")
    async with AsyncSessionLocal() as db:
        stmt_role = select(Role).where(Role.title == "Data Analyst - Mock")
        res_role = await db.execute(stmt_role)
        role = res_role.scalars().first()
        if not role:
            print("Role 'Data Analyst - Mock' not found.")
            return

        role_id = role.id

        # Find rounds
        stmt_rounds = select(Round).where(Round.role_id == role_id)
        rounds = (await db.execute(stmt_rounds)).scalars().all()
        round_ids = [r.id for r in rounds]

        # 1. Reset candidates to "applied" with score 0
        stmt_cands = select(Candidate).where(Candidate.role_id == role_id)
        cands = (await db.execute(stmt_cands)).scalars().all()
        for c in cands:
            c.status = "applied"
            c.overall_score = 0
            c.ai_match_score = 0
            c.current_round = 0

        # 2. Delete RoundResults
        await db.execute(
            delete(RoundResult).where(
                RoundResult.candidate_id.in_([c.id for c in cands])
            )
        )

        # 3. Delete MailQueue items
        await db.execute(
            delete(MailQueue).where(MailQueue.candidate_id.in_([c.id for c in cands]))
        )

        # 4. Delete BenchmarkProfile
        await db.execute(
            delete(BenchmarkProfile).where(BenchmarkProfile.role_id == role_id)
        )

        await db.commit()
        print(f"Reset {len(cands)} candidates to 'applied' status with score 0.")

        # 5. Clear Redis workflow state
        r = redis.from_url(settings.get_redis_url, decode_responses=True)
        for rid in round_ids:
            key = f"talentbench:workflow:{role_id}:{rid}"
            r.delete(key)
            print(f"Cleared Redis state for key: {key}")

    print("✅ Reset complete! 'Data Analyst - Mock' is now in clean initial state.")


if __name__ == "__main__":
    asyncio.run(reset_mock())
