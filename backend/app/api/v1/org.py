from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import Organization, OrgMember
from app.schemas import (
    ApiResponse,
    OrgMember as OrgMemberSchema,
    OrgMemberInvite,
    Organization as OrganizationSchema,
    OrganizationUpdate,
)

router = APIRouter(tags=["Organization"])


async def get_or_create_default_org(db: AsyncSession) -> Organization:
    stmt = select(Organization).limit(1)
    res = await db.execute(stmt)
    org = res.scalars().first()
    if not org:
        org = Organization(
            name="TalentBench Demo Co.",
            logo_url="",
            plan="pro",
            seats_used=8,
            seats_total=15,
        )
        db.add(org)
        await db.commit()
        await db.refresh(org)
    return org


@router.get("/org", response_model=ApiResponse[OrganizationSchema])
async def get_org(db: AsyncSession = Depends(get_db)):
    org = await get_or_create_default_org(db)
    return ApiResponse(
        data=OrganizationSchema(
            id=org.id,
            name=org.name,
            logo_url=org.logo_url or "",
            plan=org.plan,
            seats_used=org.seats_used,
            seats_total=org.seats_total,
        )
    )


@router.put("/org", response_model=ApiResponse[OrganizationSchema])
async def update_org(data: OrganizationUpdate, db: AsyncSession = Depends(get_db)):
    org = await get_or_create_default_org(db)
    if data.name is not None:
        org.name = data.name
    if data.logo_url is not None:
        org.logo_url = data.logo_url
    if data.plan is not None:
        org.plan = data.plan
    if data.seats_total is not None:
        org.seats_total = data.seats_total

    await db.commit()
    await db.refresh(org)

    return ApiResponse(
        data=OrganizationSchema(
            id=org.id,
            name=org.name,
            logo_url=org.logo_url or "",
            plan=org.plan,
            seats_used=org.seats_used,
            seats_total=org.seats_total,
        )
    )


@router.get("/org/members", response_model=ApiResponse[list[OrgMemberSchema]])
async def get_org_members(db: AsyncSession = Depends(get_db)):
    org = await get_or_create_default_org(db)
    stmt = (
        select(OrgMember)
        .where(OrgMember.org_id == org.id)
        .order_by(OrgMember.created_at)
    )
    res = await db.execute(stmt)
    members = res.scalars().all()

    if not members:
        # Create initial seed members
        seed_roles = [
            "admin",
            "recruiter",
            "recruiter",
            "viewer",
            "recruiter",
            "viewer",
            "recruiter",
        ]
        seed_names = [
            "Alex Morgan",
            "Sarah Chen",
            "Marcus Vance",
            "Elena Rostova",
            "Devon Park",
            "Priya Patel",
            "Liam O'Connor",
        ]
        for i, (name, role) in enumerate(zip(seed_names, seed_roles)):
            email = f"{name.lower().replace(' ', '.')}@talentbench.io"
            m = OrgMember(
                org_id=org.id,
                name=name,
                email=email,
                role=role,
                avatar_url=f"https://i.pravatar.cc/150?u=member{i}",
                last_active=datetime.now(timezone.utc),
            )
            db.add(m)
        await db.commit()

        stmt = (
            select(OrgMember)
            .where(OrgMember.org_id == org.id)
            .order_by(OrgMember.created_at)
        )
        res = await db.execute(stmt)
        members = res.scalars().all()

    return ApiResponse(
        data=[
            OrgMemberSchema(
                id=m.id,
                name=m.name,
                email=m.email,
                role=m.role,
                avatar_url=m.avatar_url,
                last_active=m.last_active.isoformat()
                if hasattr(m.last_active, "isoformat")
                else str(m.last_active),
            )
            for m in members
        ]
    )


@router.post("/org/members", response_model=ApiResponse[OrgMemberSchema])
async def invite_member(req: OrgMemberInvite, db: AsyncSession = Depends(get_db)):
    org = await get_or_create_default_org(db)
    name = req.email.split("@")[0].replace(".", " ").title()
    member = OrgMember(
        org_id=org.id,
        name=name,
        email=req.email.strip().lower(),
        role=req.role,
        avatar_url=f"https://i.pravatar.cc/150?u={req.email}",
        last_active=datetime.now(timezone.utc),
    )
    db.add(member)
    org.seats_used += 1
    await db.commit()
    await db.refresh(member)

    return ApiResponse(
        data=OrgMemberSchema(
            id=member.id,
            name=member.name,
            email=member.email,
            role=member.role,
            avatar_url=member.avatar_url,
            last_active=member.last_active.isoformat()
            if hasattr(member.last_active, "isoformat")
            else str(member.last_active),
        )
    )


@router.delete("/org/members/{member_id}", response_model=ApiResponse[dict])
async def remove_member(member_id: str, db: AsyncSession = Depends(get_db)):
    org = await get_or_create_default_org(db)
    stmt = select(OrgMember).where(
        OrgMember.id == member_id, OrgMember.org_id == org.id
    )
    res = await db.execute(stmt)
    member = res.scalars().first()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Member not found"
        )

    await db.delete(member)
    org.seats_used = max(1, org.seats_used - 1)
    await db.commit()

    return ApiResponse(data={"id": member_id})
