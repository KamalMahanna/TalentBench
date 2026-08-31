from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import Candidate, JobStatus
from app.schemas import ApiResponse
from app.workers.resume_tasks import process_single_candidate_resume

router = APIRouter(tags=["Attention Needed (DLQ)"])


@router.get("/roles/{role_id}/attention-needed", response_model=ApiResponse[list[dict]])
async def get_attention_needed_jobs(role_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(JobStatus).where(
        JobStatus.role_id == role_id,
        JobStatus.status.in_(["failed", "dead_letter"])
    ).order_by(JobStatus.updated_at.desc())
    res = await db.execute(stmt)
    jobs = res.scalars().all()

    items = []
    for j in jobs:
        cand_name = "Unknown Candidate"
        cand_email = ""
        if j.candidate_id:
            c_res = await db.execute(select(Candidate).where(Candidate.id == j.candidate_id))
            cand = c_res.scalars().first()
            if cand:
                cand_name = cand.name
                cand_email = cand.email

        items.append({
            "job_id": j.id,
            "candidate_id": j.candidate_id,
            "candidate_name": cand_name,
            "candidate_email": cand_email,
            "step": j.step,
            "status": j.status,
            "attempts": j.attempts,
            "error_detail": j.error_detail,
            "created_at": j.created_at.isoformat() if hasattr(j.created_at, "isoformat") else str(j.created_at),
        })

    return ApiResponse(data=items)


@router.post("/jobs/{job_id}/retry", response_model=ApiResponse[dict])
async def retry_failed_job(job_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(JobStatus).where(JobStatus.id == job_id)
    res = await db.execute(stmt)
    job = res.scalars().first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    job.status = "pending"
    job.attempts = 0
    job.error_detail = None
    await db.commit()

    if job.candidate_id and job.role_id and job.step == "resume_screening":
        try:
            process_single_candidate_resume.delay(
                batch_id=job.batch_id,
                role_id=job.role_id,
                candidate_id=job.candidate_id,
            )
        except Exception:
            pass

    return ApiResponse(data={"status": "retried", "job_id": job_id})
