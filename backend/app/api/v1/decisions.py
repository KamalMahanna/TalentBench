from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import AuditLog, Candidate, RoundResult
from app.schemas import (
    ApiResponse,
    DecisionOverrideRequest,
    RoundResult as RoundResultSchema,
)

router = APIRouter(tags=["Decisions"])


@router.post(
    "/candidates/{candidate_id}/override", response_model=ApiResponse[RoundResultSchema]
)
@router.post(
    "/candidates/{candidate_id}/rounds/{round_id}/override",
    response_model=ApiResponse[RoundResultSchema],
)
async def override_decision(
    candidate_id: str,
    req: DecisionOverrideRequest,
    round_id: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    target_round_id = round_id or req.round_id
    stmt = select(Candidate).where(Candidate.id == candidate_id)
    res = await db.execute(stmt)
    candidate = res.scalars().first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found"
        )

    rr_stmt = select(RoundResult).where(RoundResult.candidate_id == candidate_id)
    if target_round_id:
        rr_stmt = rr_stmt.where(RoundResult.round_id == target_round_id)
    rr_stmt = rr_stmt.order_by(RoundResult.evaluated_at.desc())

    rr_res = await db.execute(rr_stmt)
    round_result = rr_res.scalars().first()

    if not round_result:
        round_result = RoundResult(
            candidate_id=candidate_id,
            round_id=target_round_id or "manual_override_round",
            round_name="Decision Review",
            round_type="interview",
            status=req.target_status,
            score=80 if req.target_status == "passed" else 40,
            ai_verdict=f"Recruiter override applied: {req.reason}",
            ai_summary=req.reason,
            evaluated_at=datetime.now(timezone.utc),
            overridden=True,
            override_reason=req.reason,
            overridden_by="Alex Morgan",
            overridden_at=datetime.now(timezone.utc),
        )
        db.add(round_result)
    else:
        round_result.status = req.target_status
        round_result.overridden = True
        round_result.override_reason = req.reason
        round_result.overridden_by = "Alex Morgan"
        round_result.overridden_at = datetime.now(timezone.utc)

    audit = AuditLog(
        candidate_id=candidate.id,
        action="Decision overridden",
        actor="Alex Morgan",
        actor_type="recruiter",
        detail=req.reason,
        final_decision=req.target_status,
        timestamp=datetime.now(timezone.utc),
    )
    db.add(audit)

    if req.target_status == "passed":
        if candidate.status == "rejected":
            candidate.status = "screened"
    elif req.target_status == "failed":
        candidate.status = "rejected"

    await db.commit()
    await db.refresh(round_result)

    return ApiResponse(
        data=RoundResultSchema(
            id=round_result.id,
            candidate_id=round_result.candidate_id,
            round_id=round_result.round_id,
            round_name=round_result.round_name,
            round_type=round_result.round_type,
            status=round_result.status,
            score=round_result.score,
            ai_verdict=round_result.ai_verdict,
            ai_summary=round_result.ai_summary,
            evaluated_at=round_result.evaluated_at.isoformat()
            if hasattr(round_result.evaluated_at, "isoformat")
            else str(round_result.evaluated_at),
            overridden=round_result.overridden,
            override_reason=round_result.override_reason,
            overridden_by=round_result.overridden_by,
            overridden_at=round_result.overridden_at.isoformat()
            if round_result.overridden_at
            and hasattr(round_result.overridden_at, "isoformat")
            else None,
        )
    )
