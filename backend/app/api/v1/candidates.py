from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models import Candidate, RoundResult
from app.schemas import (
    ApiResponse,
    Candidate as CandidateSchema,
    PaginatedResponse,
    RoundResult as RoundResultSchema,
)

router = APIRouter(tags=["Candidates"])


def to_candidate_schema(c: Candidate) -> CandidateSchema:
    return CandidateSchema(
        id=c.id,
        role_id=c.role_id,
        name=c.name,
        email=c.email,
        phone=c.phone,
        avatar_url=c.avatar_url or f"https://i.pravatar.cc/150?u={c.id}",
        resume_url=c.resume_url or "#",
        status=c.status,
        current_round=c.current_round,
        overall_score=c.overall_score,
        applied_at=c.applied_at.isoformat()
        if hasattr(c.applied_at, "isoformat")
        else str(c.applied_at),
        experience_years=c.experience_years,
        current_company=c.current_company,
        skills=c.skills or [],
        projects=c.projects or [],
        education=c.education,
        location=c.location,
        ai_match_score=c.ai_match_score,
        round_results=[
            RoundResultSchema(
                id=r.id,
                candidate_id=r.candidate_id,
                round_id=r.round_id,
                round_name=r.round_name,
                round_type=r.round_type,
                status=r.status,
                score=r.score,
                ai_verdict=r.ai_verdict,
                ai_summary=r.ai_summary,
                evaluated_at=r.evaluated_at.isoformat()
                if hasattr(r.evaluated_at, "isoformat")
                else str(r.evaluated_at),
                overridden=r.overridden,
                override_reason=r.override_reason,
                overridden_by=r.overridden_by,
                overridden_at=r.overridden_at.isoformat()
                if r.overridden_at and hasattr(r.overridden_at, "isoformat")
                else (str(r.overridden_at) if r.overridden_at else None),
            )
            for r in c.round_results
        ],
    )


@router.get(
    "/roles/{role_id}/candidates", response_model=PaginatedResponse[CandidateSchema]
)
@router.get("/candidates", response_model=PaginatedResponse[CandidateSchema])
async def get_candidates(
    role_id: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    search: str | None = None,
    status: str | None = None,
    sort: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Candidate).options(selectinload(Candidate.round_results))

    if role_id:
        query = query.where(Candidate.role_id == role_id)

    if status and status != "all":
        query = query.where(Candidate.status == status)

    if search:
        s = f"%{search.strip().lower()}%"
        query = query.where(
            or_(
                func.lower(Candidate.name).like(s),
                func.lower(Candidate.email).like(s),
                func.lower(Candidate.current_company).like(s),
            )
        )

    if sort == "score_desc":
        query = query.order_by(Candidate.overall_score.desc())
    elif sort == "score_asc":
        query = query.order_by(Candidate.overall_score.asc())
    elif sort == "recent":
        query = query.order_by(Candidate.applied_at.desc())
    else:
        query = query.order_by(Candidate.applied_at.desc())

    count_query = select(func.count()).select_from(query.order_by(None).subquery())
    total_res = await db.execute(count_query)
    total = total_res.scalar() or 0

    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    res = await db.execute(query)
    candidates = res.scalars().all()

    return PaginatedResponse(
        data=[to_candidate_schema(c) for c in candidates],
        total=total,
        page=page,
        page_size=page_size,
        has_more=(offset + len(candidates)) < total,
    )


@router.get("/candidates/{candidate_id}", response_model=ApiResponse[CandidateSchema])
async def get_candidate(candidate_id: str, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Candidate)
        .where(Candidate.id == candidate_id)
        .options(selectinload(Candidate.round_results))
    )
    res = await db.execute(stmt)
    candidate = res.scalars().first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found"
        )

    return ApiResponse(data=to_candidate_schema(candidate))
