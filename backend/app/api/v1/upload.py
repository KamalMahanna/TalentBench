import uuid
from faker import Faker
from fastapi import APIRouter, Body, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models import Candidate, Role, Round, RoundResult
from app.schemas import ApiResponse, BulkUploadRequest, BulkUploadResponse
from app.workers.resume_tasks import process_batch_resumes

router = APIRouter(tags=["Upload"])
faker = Faker()


@router.post("/roles/{role_id}/upload", response_model=ApiResponse[BulkUploadResponse])
@router.post(
    "/upload", response_model=ApiResponse[BulkUploadResponse], include_in_schema=False
)
async def bulk_upload(
    role_id: str | None = None,
    req: BulkUploadRequest | None = Body(default=None),
    role_id_query: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    target_role_id = role_id or role_id_query
    if not target_role_id:
        stmt = select(Role).limit(1)
        res = await db.execute(stmt)
        r = res.scalars().first()
        if not r:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="No roles available"
            )
        target_role_id = r.id

    stmt = (
        select(Role).where(Role.id == target_role_id).options(selectinload(Role.rounds))
    )
    res = await db.execute(stmt)
    role = res.scalars().first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Role not found"
        )

    batch_id = str(uuid.uuid4())
    file_count = len(req.files) if req and req.files else 5

    created_candidate_ids = []
    for i in range(file_count):
        cand_name = faker.name()
        cand_email = faker.unique.email().lower()
        skills = ["Python", "FastAPI", "PostgreSQL", "Docker", "AWS", "Redis"]
        projects = ["Distributed Cache Service", "Event Ingestion Engine"]

        candidate = Candidate(
            role_id=role.id,
            name=cand_name,
            email=cand_email,
            phone=faker.phone_number(),
            avatar_url=f"https://i.pravatar.cc/150?u={cand_email}",
            resume_url="#",
            resume_text=f"Resume of {cand_name}. Skills: {', '.join(skills)}. Experience: 4 years as Backend Engineer.",
            status="applied",
            current_round=0,
            overall_score=75,
            experience_years=4,
            current_company="Acme Corp",
            skills=skills,
            projects=projects,
            education="B.S. Computer Science",
            location="Remote",
            ai_match_score=78,
            consent_on_file=True,
        )
        db.add(candidate)
        await db.flush()
        created_candidate_ids.append(candidate.id)

    role.applicant_count += file_count
    await db.commit()

    # Enqueue Celery async batch processing (decoupled from API response)
    try:
        process_batch_resumes.delay(
            batch_id=batch_id,
            role_id=role.id,
            candidate_ids=created_candidate_ids,
        )
    except Exception:
        pass

    return ApiResponse(
        data=BulkUploadResponse(
            uploaded=file_count,
            failed=0,
            batch_id=batch_id,
        )
    )
