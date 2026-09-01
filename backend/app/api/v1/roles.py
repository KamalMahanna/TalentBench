from datetime import datetime, timezone
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.llm import get_llm_gateway
from app.models import BenchmarkProfile, Organization, Role, Round
from app.parsing.docx_parser import parse_docx
from app.parsing.pdf_parser import parse_pdf
from app.parsing.skill_extractor import extract_candidate_metadata
from app.schemas import (
    ApiResponse,
    ParseJobDescriptionResponse,
    Role as RoleSchema,
    RoleCreate,
    RoleUpdate,
    Round as RoundSchema,
    RoundUpdate,
)

router = APIRouter(tags=["Roles"])


def default_rounds_for_role(role_id: str) -> list[Round]:
    return [
        Round(
            role_id=role_id,
            name="Resume Screen",
            type="resume_screen",
            order=0,
            input_source="excel_upload",
            ai_scored=True,
            cutoff_threshold=60,
            mail_template="Hi {{name}}, your resume is being reviewed for {{role}}.",
        ),
        Round(
            role_id=role_id,
            name="Aptitude & Reasoning",
            type="aptitude_test",
            order=1,
            input_source="ai_generated_link",
            ai_scored=True,
            cutoff_threshold=70,
            mail_template="Hi {{name}}, please complete the aptitude test for {{role}}.",
        ),
        Round(
            role_id=role_id,
            name="DSA Round",
            type="dsa_round",
            order=2,
            input_source="ai_generated_link",
            ai_scored=True,
            cutoff_threshold=65,
            mail_template="Hi {{name}}, your DSA round for {{role}} is scheduled.",
        ),
        Round(
            role_id=role_id,
            name="Technical Interview",
            type="interview",
            order=3,
            input_source="manual_entry",
            ai_scored=True,
            cutoff_threshold=75,
            mail_template="Hi {{name}}, your interview for {{role}} is confirmed.",
        ),
    ]


def to_role_schema(role: Role) -> RoleSchema:
    return RoleSchema(
        id=role.id,
        org_id=role.org_id,
        title=role.title,
        department=role.department,
        location=role.location,
        employment_type=role.employment_type,
        description=role.description,
        status=role.status,
        created_at=role.created_at.isoformat()
        if hasattr(role.created_at, "isoformat")
        else str(role.created_at),
        applicant_count=role.applicant_count,
        rounds=[
            RoundSchema(
                id=r.id,
                role_id=r.role_id,
                name=r.name,
                type=r.type,
                order=r.order,
                input_source=r.input_source,
                ai_scored=r.ai_scored,
                cutoff_threshold=r.cutoff_threshold,
                mail_template=r.mail_template,
                created_at=r.created_at.isoformat()
                if hasattr(r.created_at, "isoformat")
                else str(r.created_at),
            )
            for r in (role.rounds or [])
        ],
    )


@router.get("/roles", response_model=ApiResponse[list[RoleSchema]])
async def get_roles(db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Role).options(selectinload(Role.rounds)).order_by(Role.created_at.desc())
    )
    res = await db.execute(stmt)
    roles = res.scalars().all()
    return ApiResponse(data=[to_role_schema(r) for r in roles])


@router.get("/roles/{role_id}", response_model=ApiResponse[RoleSchema])
async def get_role(role_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Role).where(Role.id == role_id).options(selectinload(Role.rounds))
    res = await db.execute(stmt)
    role = res.scalars().first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Role not found"
        )
    return ApiResponse(data=to_role_schema(role))


@router.post("/roles", response_model=ApiResponse[RoleSchema])
async def create_role(req: RoleCreate, db: AsyncSession = Depends(get_db)):
    org_stmt = select(Organization).limit(1)
    org_res = await db.execute(org_stmt)
    org = org_res.scalars().first()
    org_id = org.id if org else "default-org-id"

    # Embed JD
    llm = get_llm_gateway()
    jd_text = f"{req.title}\n{req.description or ''}"
    jd_embedding = await llm.embed(jd_text)

    # Extract skills
    extracted = extract_candidate_metadata(jd_text)
    skills = (
        getattr(req, "skills", None)
        or extracted.get("skills")
        or ["Python", "FastAPI", "PostgreSQL", "Docker", "AWS"]
    )

    role = Role(
        org_id=org_id,
        title=req.title,
        department=req.department,
        location=req.location,
        employment_type=req.employment_type,
        description=req.description or "",
        status=req.status,
        applicant_count=0,
        jd_embedding=jd_embedding,
        extracted_skills=skills,
    )
    db.add(role)
    await db.flush()

    # Add default rounds
    rounds = default_rounds_for_role(role.id)
    for r in rounds:
        db.add(r)

    # Add initial BenchmarkProfile
    benchmark = BenchmarkProfile(
        role_id=role.id,
        source_type="jd_derived",
        shortlisted_count=10,
        avg_resume_score=80.0,
        avg_test_score=75.0,
        avg_interview_score=82.0,
        top_skills=role.extracted_skills,
        avg_experience_years=5.0,
        skill_weights={s: round(1.0 / len(skills[:5]), 2) for s in skills[:5]},
    )
    db.add(benchmark)

    await db.commit()

    # Re-fetch with rounds loaded
    stmt = select(Role).where(Role.id == role.id).options(selectinload(Role.rounds))
    res = await db.execute(stmt)
    saved_role = res.scalars().first()
    return ApiResponse(data=to_role_schema(saved_role))


@router.post("/roles/{role_id}/upload-jd", response_model=ApiResponse[RoleSchema])
async def upload_job_description_file(
    role_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload and parse a Job Description document (PDF, DOCX, TXT) for a role.
    Extracts requirements, updates the description, and recalculates the JD embedding.
    """
    stmt = select(Role).where(Role.id == role_id).options(selectinload(Role.rounds))
    res = await db.execute(stmt)
    role = res.scalars().first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Role not found"
        )

    content_bytes = await file.read()
    filename = file.filename.lower() if file.filename else "jd.txt"

    if filename.endswith(".pdf"):
        jd_text = parse_pdf(content_bytes)
    elif filename.endswith((".docx", ".doc")):
        jd_text = parse_docx(content_bytes)
    else:
        jd_text = content_bytes.decode("utf-8", errors="ignore")

    if not jd_text or len(jd_text.strip()) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not extract text from the uploaded JD file.",
        )

    # Update description & embedding
    role.description = jd_text
    extracted = extract_candidate_metadata(jd_text)
    if extracted.get("skills"):
        role.extracted_skills = extracted["skills"]

    llm = get_llm_gateway()
    role.jd_embedding = await llm.embed(f"{role.title}\n{jd_text}")

    await db.commit()
    await db.refresh(role)
    return ApiResponse(data=to_role_schema(role))


@router.post("/roles/parse-jd", response_model=ApiResponse[ParseJobDescriptionResponse])
async def parse_job_description_file(
    file: UploadFile = File(...),
):
    """
    Parse an uploaded Job Description file (PDF, DOCX, DOC, TXT, MD) and return the extracted raw text
    and an optional suggested title. Used during role creation so recruiters can review and edit
    the extracted text before creating the role.
    """
    content_bytes = await file.read()
    filename = file.filename.lower() if file.filename else "jd.txt"

    if filename.endswith(".pdf"):
        jd_text = parse_pdf(content_bytes)
    elif filename.endswith((".docx", ".doc")):
        jd_text = parse_docx(content_bytes)
    else:
        jd_text = content_bytes.decode("utf-8", errors="ignore")

    clean_text = jd_text.strip()
    if (
        not clean_text
        or len(clean_text) < 5
        or clean_text.startswith("Error extracting")
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not extract readable text from the uploaded JD file.",
        )

    # Suggest a title from the first non-empty heading/line or filename
    suggested_title = None
    for line in clean_text.splitlines():
        cleaned_line = line.strip().lstrip("#").strip()
        if 3 < len(cleaned_line) < 80 and not cleaned_line.lower().startswith(
            ("http", "page ", "www.")
        ):
            suggested_title = cleaned_line
            break

    if not suggested_title and file.filename:
        suggested_title = (
            file.filename.rsplit(".", 1)[0].replace("-", " ").replace("_", " ").title()
        )

    return ApiResponse(
        data=ParseJobDescriptionResponse(
            filename=file.filename or "jd.txt",
            text=clean_text,
            suggested_title=suggested_title,
        )
    )


@router.put("/roles/{role_id}", response_model=ApiResponse[RoleSchema])
async def update_role(
    role_id: str, req: RoleUpdate, db: AsyncSession = Depends(get_db)
):
    stmt = select(Role).where(Role.id == role_id).options(selectinload(Role.rounds))
    res = await db.execute(stmt)
    role = res.scalars().first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Role not found"
        )

    if req.title is not None:
        role.title = req.title
    if req.department is not None:
        role.department = req.department
    if req.location is not None:
        role.location = req.location
    if req.employment_type is not None:
        role.employment_type = req.employment_type
    if req.description is not None:
        role.description = req.description
        llm = get_llm_gateway()
        role.jd_embedding = await llm.embed(f"{role.title}\n{role.description}")
        extracted = extract_candidate_metadata(role.description)
        if extracted.get("skills"):
            role.extracted_skills = extracted["skills"]
    if req.status is not None:
        role.status = req.status

    await db.commit()
    await db.refresh(role)
    return ApiResponse(data=to_role_schema(role))


@router.delete("/roles/{role_id}", response_model=ApiResponse[dict])
async def delete_role(role_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Role).where(Role.id == role_id)
    res = await db.execute(stmt)
    role = res.scalars().first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Role not found"
        )

    await db.delete(role)
    await db.commit()
    return ApiResponse(data={"id": role_id})


@router.put("/roles/{role_id}/rounds", response_model=ApiResponse[list[RoundSchema]])
async def update_rounds(
    role_id: str, rounds_data: list[RoundUpdate], db: AsyncSession = Depends(get_db)
):
    stmt = select(Role).where(Role.id == role_id).options(selectinload(Role.rounds))
    res = await db.execute(stmt)
    role = res.scalars().first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Role not found"
        )

    # Clear existing and replace or update
    for existing in role.rounds:
        await db.delete(existing)
    await db.flush()

    new_rounds = []
    for i, r in enumerate(rounds_data):
        new_round = Round(
            id=r.id or None,
            role_id=role_id,
            name=r.name or f"Round {i + 1}",
            type=r.type or "custom",
            order=r.order if r.order is not None else i,
            input_source=r.input_source or "manual_entry",
            ai_scored=r.ai_scored if r.ai_scored is not None else True,
            cutoff_threshold=r.cutoff_threshold
            if r.cutoff_threshold is not None
            else 60,
            mail_template=r.mail_template or "",
        )
        db.add(new_round)
        new_rounds.append(new_round)

    await db.commit()

    # Re-fetch
    stmt = select(Round).where(Round.role_id == role_id).order_by(Round.order)
    res = await db.execute(stmt)
    saved_rounds = res.scalars().all()

    return ApiResponse(
        data=[
            RoundSchema(
                id=r.id,
                role_id=r.role_id,
                name=r.name,
                type=r.type,
                order=r.order,
                input_source=r.input_source,
                ai_scored=r.ai_scored,
                cutoff_threshold=r.cutoff_threshold,
                mail_template=r.mail_template,
                created_at=r.created_at.isoformat()
                if hasattr(r.created_at, "isoformat")
                else str(r.created_at),
            )
            for r in saved_rounds
        ]
    )
