from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import BenchmarkProfile, Candidate, Role
from app.schemas import (
    ApiResponse,
    CategoryScore,
    PerformanceReport,
    RadarScore,
    SkillScore,
)

router = APIRouter(tags=["Performance Reports"])


@router.get(
    "/candidates/{candidate_id}/performance-report",
    response_model=ApiResponse[PerformanceReport],
)
@router.get(
    "/candidates/{candidate_id}/report",
    response_model=ApiResponse[PerformanceReport],
    include_in_schema=False,
)
async def get_performance_report(candidate_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Candidate).where(Candidate.id == candidate_id)
    res = await db.execute(stmt)
    candidate = res.scalars().first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found"
        )

    role_stmt = select(Role).where(Role.id == candidate.role_id)
    role_res = await db.execute(role_stmt)
    role = role_res.scalars().first()
    role_title = role.title if role else "Software Engineer"

    # Outcome
    outcome = "shortlisted"
    if candidate.status == "hired":
        outcome = "passed"
    elif candidate.status == "rejected":
        outcome = "rejected"

    skills = candidate.skills or ["Python", "FastAPI", "PostgreSQL", "System Design"]
    projects = candidate.projects or ["Distributed Cache Engine", "Real-Time Pipeline"]

    resume_match = [
        SkillScore(
            skill=skill,
            candidate_score=max(45, min(95, candidate.overall_score + (i * 3 - 5))),
            benchmark_score=75,
        )
        for i, skill in enumerate(skills[:5])
    ]

    project_depth = [
        CategoryScore(
            category=p,
            candidate_score=max(40, min(92, candidate.overall_score + (i * 4 - 6))),
            benchmark_score=78,
        )
        for i, p in enumerate(projects[:4])
    ]

    aptitude_breakdown = [
        CategoryScore(
            category="Logical Reasoning",
            candidate_score=max(40, candidate.overall_score - 4),
            benchmark_score=75,
        ),
        CategoryScore(
            category="Quantitative",
            candidate_score=max(35, candidate.overall_score - 8),
            benchmark_score=70,
        ),
        CategoryScore(
            category="Verbal",
            candidate_score=max(45, candidate.overall_score + 5),
            benchmark_score=72,
        ),
        CategoryScore(
            category="Spatial",
            candidate_score=max(40, candidate.overall_score + 2),
            benchmark_score=68,
        ),
    ]

    communication_rubric = [
        CategoryScore(
            category="Clarity",
            candidate_score=max(50, candidate.overall_score + 4),
            benchmark_score=80,
        ),
        CategoryScore(
            category="Confidence",
            candidate_score=max(45, candidate.overall_score),
            benchmark_score=75,
        ),
        CategoryScore(
            category="Technical Articulation",
            candidate_score=max(50, candidate.overall_score + 2),
            benchmark_score=78,
        ),
        CategoryScore(
            category="Active Listening",
            candidate_score=max(55, candidate.overall_score + 6),
            benchmark_score=82,
        ),
    ]

    radar_scores = [
        RadarScore(
            dimension="Resume Match",
            candidate=max(40, candidate.ai_match_score),
            benchmark=80,
        ),
        RadarScore(
            dimension="Project Depth",
            candidate=max(40, candidate.overall_score + 3),
            benchmark=78,
        ),
        RadarScore(
            dimension="Aptitude",
            candidate=max(35, candidate.overall_score - 5),
            benchmark=75,
        ),
        RadarScore(
            dimension="Communication",
            candidate=max(45, candidate.overall_score + 5),
            benchmark=80,
        ),
        RadarScore(
            dimension="DSA Skills",
            candidate=max(40, candidate.overall_score - 2),
            benchmark=75,
        ),
        RadarScore(
            dimension="Culture Fit",
            candidate=max(50, candidate.overall_score + 4),
            benchmark=78,
        ),
    ]

    report = PerformanceReport(
        candidate_id=candidate.id,
        candidate_name=candidate.name,
        role_title=role_title,
        company_name="TalentBench Demo Co.",
        generated_at=datetime.now(timezone.utc).isoformat(),
        outcome=outcome,
        overall_percentile=min(99, max(30, int(candidate.overall_score * 1.1))),
        resume_match=resume_match,
        project_depth=project_depth,
        aptitude_breakdown=aptitude_breakdown,
        communication_rubric=communication_rubric,
        radar_scores=radar_scores,
        ai_feedback=(
            f"You demonstrated solid fundamentals in {skills[0] if skills else 'software engineering'} with practical execution depth. "
            f"Your project portfolio shows good system design awareness. "
            f"Compared to shortlisted candidates for this {role_title} role, your performance placed in the top percentile tier for architectural clarity."
        ),
        improvement_areas=[
            "Strengthen quantitative reasoning — focus on time/complexity trade-offs in distributed services",
            "Add more production-scale metrics to project case studies",
            "Practice articulating architecture trade-offs under high-throughput constraints",
        ],
        strengths=[
            f"Strong {skills[0] if skills else 'technical'} foundation and code craftsmanship",
            "Clear project documentation and API interface design",
            "Good communication scores and active problem breakdown",
        ],
    )

    return ApiResponse(data=report)
