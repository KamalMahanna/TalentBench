from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.middleware.auth import create_access_token, get_password_hash, verify_password
from app.models import Organization, OrgMember, User
from app.schemas import ApiResponse, AuthUser, LoginRequest, SignupRequest

router = APIRouter(tags=["Auth"])


@router.post("/auth/login", response_model=ApiResponse[AuthUser])
@router.post("/login", response_model=ApiResponse[AuthUser], include_in_schema=False)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    email_clean = req.email.strip().lower()
    stmt = select(User).where(User.email == email_clean)
    res = await db.execute(stmt)
    user = res.scalars().first()

    if not user:
        org_stmt = select(Organization).limit(1)
        org_res = await db.execute(org_stmt)
        org = org_res.scalars().first()
        if not org:
            org = Organization(
                name="TalentBench Demo Co.", plan="pro", seats_used=1, seats_total=15
            )
            db.add(org)
            await db.flush()

        user = User(
            org_id=org.id,
            email=email_clean,
            name=email_clean.split("@")[0].replace(".", " ").title(),
            hashed_password=get_password_hash(req.password or "demo1234"),
            avatar_url=f"https://i.pravatar.cc/150?u={email_clean}",
            role="recruiter",
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    token = create_access_token(
        {"sub": user.id, "email": user.email, "org_id": user.org_id}
    )
    auth_user = AuthUser(
        id=user.id,
        email=user.email,
        name=user.name,
        avatar_url=user.avatar_url,
        org_id=user.org_id,
        token=token,
    )
    return ApiResponse(data=auth_user)


@router.post("/auth/signup", response_model=ApiResponse[AuthUser])
@router.post("/signup", response_model=ApiResponse[AuthUser], include_in_schema=False)
async def signup(req: SignupRequest, db: AsyncSession = Depends(get_db)):
    email_clean = req.email.strip().lower()
    stmt = select(User).where(User.email == email_clean)
    res = await db.execute(stmt)
    existing = res.scalars().first()

    if existing:
        token = create_access_token(
            {"sub": existing.id, "email": existing.email, "org_id": existing.org_id}
        )
        return ApiResponse(
            data=AuthUser(
                id=existing.id,
                email=existing.email,
                name=existing.name,
                avatar_url=existing.avatar_url,
                org_id=existing.org_id,
                token=token,
            )
        )

    org = Organization(
        name=req.org_name or f"{req.name}'s Org",
        plan="pro",
        seats_used=1,
        seats_total=15,
    )
    db.add(org)
    await db.flush()

    user = User(
        org_id=org.id,
        email=email_clean,
        name=req.name,
        hashed_password=get_password_hash("demo1234"),
        avatar_url=f"https://i.pravatar.cc/150?u={email_clean}",
        role="admin",
    )
    db.add(user)

    member = OrgMember(
        org_id=org.id,
        name=req.name,
        email=email_clean,
        role="admin",
        avatar_url=user.avatar_url,
    )
    db.add(member)

    await db.commit()
    await db.refresh(user)

    token = create_access_token(
        {"sub": user.id, "email": user.email, "org_id": user.org_id}
    )
    return ApiResponse(
        data=AuthUser(
            id=user.id,
            email=user.email,
            name=user.name,
            avatar_url=user.avatar_url,
            org_id=user.org_id,
            token=token,
        )
    )
