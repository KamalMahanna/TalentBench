from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import Candidate, Role
from app.schemas import ApiResponse, DashboardStats

router = APIRouter(tags=["Dashboard"])


@router.get("/dashboard/stats", response_model=ApiResponse[DashboardStats])
@router.get("/stats", response_model=ApiResponse[DashboardStats], include_in_schema=False)
async def get_dashboard_stats(db: AsyncSession = Depends(get_db)):
    roles_stmt = select(Role)
    roles_res = await db.execute(roles_stmt)
    roles = roles_res.scalars().all()

    total_roles = len(roles)
    active_roles = sum(1 for r in roles if r.status == "active")

    total_candidates_stmt = select(func.count(Candidate.id))
    tc_res = await db.execute(total_candidates_stmt)
    total_candidates = tc_res.scalar() or 0

    hired_stmt = select(func.count(Candidate.id)).where(Candidate.status == "hired")
    hired_res = await db.execute(hired_stmt)
    hired_this_month = hired_res.scalar() or 0

    stats = DashboardStats(
        total_roles=total_roles,
        active_roles=active_roles,
        total_candidates=total_candidates,
        hired_this_month=hired_this_month,
        avg_time_to_hire_days=24,
        pipeline_value=total_candidates * 350,
    )
    return ApiResponse(data=stats)
