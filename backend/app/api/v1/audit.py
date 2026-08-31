from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import AuditLog, Candidate
from app.schemas import ApiResponse, AuditLog as AuditLogSchema

router = APIRouter(tags=["Audit"])


@router.get("/candidates/{candidate_id}/audit-log", response_model=ApiResponse[list[AuditLogSchema]])
@router.get("/candidates/{candidate_id}/audit", response_model=ApiResponse[list[AuditLogSchema]], include_in_schema=False)
async def get_candidate_audit_log(candidate_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Candidate).where(Candidate.id == candidate_id)
    res = await db.execute(stmt)
    candidate = res.scalars().first()
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")

    audit_stmt = select(AuditLog).where(AuditLog.candidate_id == candidate_id).order_by(AuditLog.timestamp.desc())
    audit_res = await db.execute(audit_stmt)
    logs = audit_res.scalars().all()

    if not logs:
        init_log = AuditLog(
            candidate_id=candidate.id,
            action="Application received",
            actor="system",
            actor_type="system",
            detail="Resume uploaded and parsed successfully",
            timestamp=candidate.applied_at,
        )
        db.add(init_log)
        await db.commit()
        logs = [init_log]

    return ApiResponse(
        data=[
            AuditLogSchema(
                id=l.id,
                candidate_id=l.candidate_id,
                action=l.action,
                actor=l.actor,
                actor_type=l.actor_type,
                detail=l.detail,
                timestamp=l.timestamp.isoformat() if hasattr(l.timestamp, "isoformat") else str(l.timestamp),
            )
            for l in logs
        ]
    )
