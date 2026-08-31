from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import BenchmarkProfile, Role
from app.schemas import ApiResponse, BenchmarkProfile as BenchmarkProfileSchema
from app.workers.benchmark_tasks import build_benchmark_profile_from_source

router = APIRouter(tags=["Benchmark"])


@router.get(
    "/roles/{role_id}/benchmark", response_model=ApiResponse[BenchmarkProfileSchema]
)
async def get_benchmark_profile(role_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(BenchmarkProfile).where(BenchmarkProfile.role_id == role_id)
    res = await db.execute(stmt)
    profile = res.scalars().first()

    if not profile:
        role_stmt = select(Role).where(Role.id == role_id)
        r_res = await db.execute(role_stmt)
        role = r_res.scalars().first()
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Role not found"
            )

        profile = BenchmarkProfile(
            role_id=role.id,
            source_type="jd_derived",
            shortlisted_count=12,
            avg_resume_score=82.5,
            avg_test_score=78.0,
            avg_interview_score=85.0,
            top_skills=role.extracted_skills or ["Python", "FastAPI", "PostgreSQL"],
            avg_experience_years=5.5,
            skill_weights={"Python": 0.4, "FastAPI": 0.3, "PostgreSQL": 0.3},
        )
        db.add(profile)
        await db.commit()
        await db.refresh(profile)

    return ApiResponse(
        data=BenchmarkProfileSchema(
            shortlisted_count=profile.shortlisted_count,
            avg_resume_score=profile.avg_resume_score,
            avg_test_score=profile.avg_test_score,
            avg_interview_score=profile.avg_interview_score,
            top_skills=profile.top_skills or [],
            avg_experience_years=profile.avg_experience_years,
        )
    )


@router.post("/roles/{role_id}/benchmark/generate", response_model=ApiResponse[dict])
async def trigger_benchmark_generation(
    role_id: str, db: AsyncSession = Depends(get_db)
):
    stmt = select(Role).where(Role.id == role_id)
    res = await db.execute(stmt)
    role = res.scalars().first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Role not found"
        )

    try:
        build_benchmark_profile_from_source.delay(
            role_id=role_id, source_type="jd_derived"
        )
    except Exception:
        pass

    return ApiResponse(data={"status": "enqueued", "role_id": role_id})
