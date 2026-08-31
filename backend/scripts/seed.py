import asyncio
import random
from datetime import datetime, timedelta, timezone
from faker import Faker
from sqlalchemy import select
from app.config import settings
from app.database import AsyncSessionLocal, async_engine
from app.middleware.auth import get_password_hash
from app.models import (
    AuditLog,
    Base,
    BenchmarkProfile,
    Candidate,
    Organization,
    OrgMember,
    Role,
    Round,
    RoundResult,
    User,
)

faker = Faker()
Faker.seed(42)
random.seed(42)

DEPARTMENTS = ["Engineering", "Data Science", "Product", "Design", "DevOps", "Security"]
LOCATIONS = [
    "San Francisco, US",
    "Remote",
    "London, UK",
    "Bangalore, IN",
    "Berlin, DE",
    "New York, US",
]
COMPANIES = [
    "Stripe",
    "Vercel",
    "Linear",
    "Figma",
    "Notion",
    "Airbnb",
    "Shopify",
    "Datadog",
    "Snowflake",
    "Ramp",
]
SKILL_POOL = [
    "React",
    "TypeScript",
    "Node.js",
    "Python",
    "FastAPI",
    "AWS",
    "Docker",
    "GraphQL",
    "PostgreSQL",
    "Kubernetes",
    "Go",
    "Rust",
    "Java",
    "System Design",
    "Microservices",
    "CI/CD",
    "Redis",
    "Kafka",
]
PROJECT_POOL = [
    "Distributed Cache Engine",
    "Real-time Collab Editor",
    "ML Pipeline Orchestrator",
    "E-commerce Platform",
    "Chat Infrastructure",
    "Analytics Dashboard",
    "API Gateway",
    "K8s Operator",
    "Game Engine",
    "Search Engine",
]

ROUND_TEMPLATES = [
    {
        "name": "Resume Screen",
        "type": "resume_screen",
        "input_source": "excel_upload",
        "ai_scored": True,
        "cutoff_threshold": 60,
        "mail_template": "Hi {{name}}, your resume is being reviewed for {{role}}.",
    },
    {
        "name": "Aptitude & Reasoning",
        "type": "aptitude_test",
        "input_source": "ai_generated_link",
        "ai_scored": True,
        "cutoff_threshold": 70,
        "mail_template": "Hi {{name}}, please complete the aptitude test for {{role}}.",
    },
    {
        "name": "DSA Round",
        "type": "dsa_round",
        "input_source": "ai_generated_link",
        "ai_scored": True,
        "cutoff_threshold": 65,
        "mail_template": "Hi {{name}}, your DSA round for {{role}} is scheduled.",
    },
    {
        "name": "Technical Interview",
        "type": "interview",
        "input_source": "manual_entry",
        "ai_scored": True,
        "cutoff_threshold": 75,
        "mail_template": "Hi {{name}}, your interview for {{role}} is confirmed.",
    },
]


async def seed_database():
    print("Seeding TalentBench database...")

    # Ensure tables exist
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # Check if already seeded
        res = await db.execute(select(Organization).limit(1))
        existing_org = res.scalars().first()
        if existing_org:
            print("Database already contains data, checking users/roles...")
        else:
            print("Creating organization and admin users...")

        # Organization
        if not existing_org:
            org = Organization(
                name="TalentBench Demo Co.",
                logo_url="",
                plan="pro",
                seats_used=8,
                seats_total=15,
            )
            db.add(org)
            await db.flush()
        else:
            org = existing_org

        # Users
        user_res = await db.execute(
            select(User).where(User.email == "recruiter@talentbench.io")
        )
        if not user_res.scalars().first():
            user = User(
                org_id=org.id,
                email="recruiter@talentbench.io",
                name="Alex Morgan",
                hashed_password=get_password_hash("demo1234"),
                avatar_url="https://i.pravatar.cc/150?u=recruiter",
                role="admin",
            )
            db.add(user)

        # Org Members
        members_res = await db.execute(
            select(OrgMember).where(OrgMember.org_id == org.id)
        )
        if not members_res.scalars().first():
            member_configs = [
                ("Alex Morgan", "recruiter@talentbench.io", "admin"),
                ("Sarah Chen", "sarah.chen@talentbench.io", "recruiter"),
                ("Marcus Vance", "marcus.vance@talentbench.io", "recruiter"),
                ("Elena Rostova", "elena.rostova@talentbench.io", "viewer"),
                ("Devon Park", "devon.park@talentbench.io", "recruiter"),
                ("Priya Patel", "priya.patel@talentbench.io", "viewer"),
                ("Liam O'Connor", "liam.oconnor@talentbench.io", "recruiter"),
            ]
            for i, (name, email, role) in enumerate(member_configs):
                m = OrgMember(
                    org_id=org.id,
                    name=name,
                    email=email,
                    role=role,
                    avatar_url=f"https://i.pravatar.cc/150?u=member{i}",
                    last_active=datetime.now(timezone.utc)
                    - timedelta(days=random.randint(0, 5)),
                )
                db.add(m)

        # Roles & Pipeline
        roles_res = await db.execute(select(Role).where(Role.org_id == org.id))
        existing_roles = roles_res.scalars().all()

        role_titles = [
            "Senior Frontend Engineer",
            "Backend Engineer",
            "Staff Platform Engineer",
            "Product Designer",
            "Data Scientist",
            "DevOps Engineer",
        ]

        if not existing_roles:
            print("Creating roles, rounds, and candidate benchmarks...")
            for i, title in enumerate(role_titles):
                status = "active" if i < 4 else ("draft" if i == 4 else "closed")
                role = Role(
                    org_id=org.id,
                    title=title,
                    department=DEPARTMENTS[i % len(DEPARTMENTS)],
                    location=random.choice(LOCATIONS),
                    employment_type="Full-time",
                    description=f"Seeking an experienced {title} to build next-generation distributed systems and high-impact features.",
                    status=status,
                    applicant_count=100 if i < 2 else 40,
                    extracted_skills=random.sample(SKILL_POOL, k=5),
                )
                db.add(role)
                await db.flush()

                # Add Rounds
                rounds = []
                for order, tpl in enumerate(ROUND_TEMPLATES):
                    r = Round(
                        role_id=role.id,
                        name=tpl["name"],
                        type=tpl["type"],
                        order=order,
                        input_source=tpl["input_source"],
                        ai_scored=tpl["ai_scored"],
                        cutoff_threshold=tpl["cutoff_threshold"],
                        mail_template=tpl["mail_template"],
                    )
                    db.add(r)
                    rounds.append(r)
                await db.flush()

                # BenchmarkProfile
                benchmark = BenchmarkProfile(
                    role_id=role.id,
                    source_type="jd_derived",
                    shortlisted_count=15,
                    avg_resume_score=84.0,
                    avg_test_score=78.5,
                    avg_interview_score=86.0,
                    top_skills=role.extracted_skills,
                    avg_experience_years=5.8,
                    skill_weights={s: 0.2 for s in role.extracted_skills},
                )
                db.add(benchmark)

                # Seed Candidates
                cand_count = 50 if i < 2 else 20
                for j in range(cand_count):
                    c_name = faker.name()
                    c_email = faker.unique.email().lower()
                    statuses = [
                        "applied",
                        "screened",
                        "tested",
                        "interviewed",
                        "hired",
                        "rejected",
                    ]
                    weights = [0.3, 0.25, 0.15, 0.15, 0.05, 0.1]
                    cand_status = random.choices(statuses, weights=weights)[0]

                    current_round = (
                        0
                        if cand_status == "applied"
                        else 1
                        if cand_status == "screened"
                        else 2
                        if cand_status == "tested"
                        else 3
                        if cand_status == "interviewed"
                        else 4
                        if cand_status == "hired"
                        else random.randint(1, 3)
                    )

                    skills = random.sample(SKILL_POOL, k=random.randint(4, 7))
                    projects = random.sample(PROJECT_POOL, k=random.randint(2, 4))
                    overall_score = (
                        random.randint(55, 96)
                        if cand_status != "rejected"
                        else random.randint(35, 58)
                    )

                    cand = Candidate(
                        role_id=role.id,
                        name=c_name,
                        email=c_email,
                        phone=faker.phone_number(),
                        avatar_url=f"https://i.pravatar.cc/150?u={j + i * 1000}",
                        resume_url="#",
                        resume_text=f"Resume of {c_name}. Skills: {', '.join(skills)}. Projects: {', '.join(projects)}.",
                        status=cand_status,
                        current_round=current_round,
                        overall_score=overall_score,
                        applied_at=datetime.now(timezone.utc)
                        - timedelta(days=random.randint(1, 30)),
                        experience_years=random.randint(1, 12),
                        current_company=random.choice(COMPANIES),
                        skills=skills,
                        projects=projects,
                        education=f"B.S. in CS from {faker.company()} University",
                        location=random.choice(LOCATIONS),
                        ai_match_score=random.randint(50, 98),
                        consent_on_file=True,
                    )
                    db.add(cand)
                    await db.flush()

                    # Round results for evaluated rounds
                    for r_idx in range(min(current_round, len(rounds))):
                        evaluated_round = rounds[r_idx]
                        passed = (
                            True
                            if cand_status == "hired"
                            else (
                                False
                                if cand_status == "rejected"
                                and r_idx == current_round - 1
                                else True
                            )
                        )
                        r_score = (
                            random.randint(evaluated_round.cutoff_threshold, 98)
                            if passed
                            else random.randint(
                                30, evaluated_round.cutoff_threshold - 5
                            )
                        )

                        rr = RoundResult(
                            candidate_id=cand.id,
                            round_id=evaluated_round.id,
                            round_name=evaluated_round.name,
                            round_type=evaluated_round.type,
                            status="passed" if passed else "failed",
                            score=r_score,
                            ai_verdict=(
                                f"Candidate demonstrates strong {evaluated_round.name.lower()} alignment with score {r_score}/100."
                                if passed
                                else f"Score of {r_score}/100 falls below cutoff threshold of {evaluated_round.cutoff_threshold}."
                            ),
                            ai_summary=f"Evaluated competencies across practical execution and benchmark standards.",
                            evaluated_at=datetime.now(timezone.utc)
                            - timedelta(days=random.randint(0, 10)),
                            overridden=random.random() < 0.05,
                            override_reason="Recruiter override: exceptional portfolio depth"
                            if random.random() < 0.05
                            else None,
                            overridden_by="Alex Morgan"
                            if random.random() < 0.05
                            else None,
                            overridden_at=datetime.now(timezone.utc)
                            if random.random() < 0.05
                            else None,
                        )
                        db.add(rr)

                        # Audit log
                        audit = AuditLog(
                            candidate_id=cand.id,
                            action=f"Round evaluated: {evaluated_round.name}",
                            actor="AI Evaluator",
                            actor_type="ai",
                            detail=rr.ai_verdict,
                            prompt_template_id=f"eval_{evaluated_round.type}_v1",
                            model_name="mock-gpt-4o",
                            final_decision="passed" if passed else "failed",
                            timestamp=rr.evaluated_at,
                        )
                        db.add(audit)

        await db.commit()
        print("Database seeded successfully!")


if __name__ == "__main__":
    asyncio.run(seed_database())
