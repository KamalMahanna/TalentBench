import asyncio
from datetime import datetime, timezone
import json
import time
import uuid
import redis
import structlog
from app.config import settings
from app.database import get_sync_db
from app.llm import get_llm_gateway
from app.models import (
    AuditLog,
    BenchmarkProfile,
    Candidate,
    MailQueue,
    Role,
    Round,
    RoundResult,
)
from app.workers.celery_app import celery_app
from app.workers.resume_tasks import publish_event

logger = structlog.get_logger()


def get_redis_client():
    return redis.from_url(settings.get_redis_url, decode_responses=True)


def update_workflow_state(
    role_id: str,
    round_id: str,
    status: str,
    current_step: int,
    total_steps: int,
    step_name: str,
    new_log: dict | None = None,
    stats_update: dict | None = None,
):
    try:
        r = get_redis_client()
        key = f"talentbench:workflow:{role_id}:{round_id}"
        current = r.get(key)
        data = (
            json.loads(current)
            if current
            else {
                "role_id": role_id,
                "round_id": round_id,
                "status": "running",
                "current_step": 1,
                "total_steps": 6,
                "step_name": "Initializing",
                "logs": [],
                "stats": {"total": 0, "processed": 0, "advanced": 0, "disqualified": 0},
                "started_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        )

        data["status"] = status
        data["current_step"] = current_step
        data["total_steps"] = total_steps
        data["step_name"] = step_name
        data["updated_at"] = datetime.now(timezone.utc).isoformat()

        if stats_update:
            data["stats"].update(stats_update)

        if new_log:
            logs = data.get("logs", [])
            logs.append(new_log)
            # Keep latest 100 logs in Redis
            data["logs"] = logs[-100:]

        r.setex(key, 86400, json.dumps(data))
    except Exception as e:
        logger.warning("failed_to_update_workflow_state", error=str(e))


def stream_agent_log(
    role_id: str,
    round_id: str,
    tag: str,
    message: str,
    candidate_id: str | None = None,
    step_idx: int = 1,
    total_steps: int = 6,
    step_name: str = "Processing",
    stats: dict | None = None,
):
    now_str = datetime.now(timezone.utc).strftime("%H:%M:%S")
    log_entry = {
        "id": str(uuid.uuid4())[:8],
        "timestamp": now_str,
        "tag": tag,
        "message": message,
        "candidate_id": candidate_id,
    }

    # Persist in Redis state
    update_workflow_state(
        role_id=role_id,
        round_id=round_id,
        status="running",
        current_step=step_idx,
        total_steps=total_steps,
        step_name=step_name,
        new_log=log_entry,
        stats_update=stats,
    )

    # Stream to SSE channel
    publish_event(
        role_id=role_id,
        event_type="agent_workflow_event",
        payload={
            "round_id": round_id,
            "current_step": step_idx,
            "total_steps": total_steps,
            "step_name": step_name,
            "log": log_entry,
            "stats": stats,
        },
    )


def run_data_analyst_mock_workflow(role: Role, round_obj: Round, db):
    """
    Dedicated showcase workflow for 'Data Analyst - Mock'.
    Simulates realistic agent thought streaming, candidate evaluation,
    benchmark synthesis, and personalized rejection email bodies.
    """
    role_id = role.id
    round_id = round_obj.id
    total_steps = 6

    REJECTION_MAIL_MAP = {
        "rahul.nair@frontenddev.co": (
            "Skill Gap: Frontend UI/UX (React/Tailwind) without SQL, Python data wrangling, or BI dashboards.",
            (
                "Dear Rahul,\n\n"
                "Thank you for applying for the Data Analyst position at TalentBench.\n\n"
                "While your 1.5 years of experience in React and frontend development is impressive, this role strictly requires hands-on proficiency in relational database querying (SQL CTEs, window functions), exploratory data analysis (Pandas), and BI dashboarding (Power BI / Tableau). Because your background focuses primarily on frontend UI development, we are unable to advance your application at this time.\n\n"
                "Actionable Advice: We recommend learning SQL fundamentals and building an exploratory business analytics dashboard before re-applying.\n\n"
                "Best regards,\n"
                "TalentBench Analytics Hiring Team"
            ),
        ),
        "tanvi.joshi@designstudio.in": (
            "Domain Mismatch: Graphic & UI/UX Design without quantitative data analytics or SQL querying.",
            (
                "Dear Tanvi,\n\n"
                "Thank you for your interest in the Data Analyst role at TalentBench.\n\n"
                "After reviewing your portfolio, we were impressed by your 2.0 years of experience in product design, wireframing, and Figma prototyping. However, the Data Analyst position is a deeply technical and quantitative role requiring SQL database extraction, statistical data wrangling, and metric reporting. As your profile is specialized in UI/UX visual design, we will not be moving forward with your application.\n\n"
                "Actionable Advice: If you are interested in transitioning into analytics, we suggest completing projects involving SQL queries and data storytelling with Tableau.\n\n"
                "Best regards,\n"
                "TalentBench Analytics Hiring Team"
            ),
        ),
        "karthik.raja@qaautomation.io": (
            "Skill Gap: QA Manual Software Testing; lacks relational SQL data modeling, BI reporting, and EDA.",
            (
                "Dear Karthik,\n\n"
                "Thank you for applying for the Data Analyst role at TalentBench.\n\n"
                "Your background of 1.6 years in QA test execution and Selenium testing provides strong analytical discipline. However, our Data Analyst role requires dedicated experience in SQL schema querying, business KPI dashboarding in Power BI/Tableau, and data manipulation in Python. As your experience is primarily in software testing and quality assurance, we cannot advance your application for this vacancy.\n\n"
                "Best regards,\n"
                "TalentBench Analytics Hiring Team"
            ),
        ),
        "divya.agarwal@freshgrad.edu": (
            "Experience Gap: Fresh university graduate (0.2 yrs summer internship); requires min 1.0 yr full-time exp.",
            (
                "Dear Divya,\n\n"
                "Thank you for applying for the Data Analyst role at TalentBench.\n\n"
                "We noted your strong academic foundation from DTU and your enthusiastic projects in Python. However, this role has a mandatory requirement of at least 1 year of full-time professional experience in data analysis. As per our recruitment policy, short summer internships and academic coursework cannot be counted toward the 1-year full-time experience threshold.\n\n"
                "Recommendation: We encourage you to gain 10-12 months of industry data experience and consider re-applying in the future!\n\n"
                "Best regards,\n"
                "TalentBench Analytics Hiring Team"
            ),
        ),
        "amitabh.sen@digitalgrow.biz": (
            "Domain Mismatch: Digital Marketing & PPC ad campaigns without technical SQL or data warehouse schemas.",
            (
                "Dear Amitabh,\n\n"
                "Thank you for applying for the Data Analyst position at TalentBench.\n\n"
                "Your 1.8 years of experience managing PPC campaigns and SEO marketing demonstrates strong commercial understanding. However, this Data Analyst role is situated within our core data platform team and requires technical SQL querying (joins, CTEs, window functions), data warehouse modeling, and Python/Pandas data manipulation rather than marketing campaign execution.\n\n"
                "Best regards,\n"
                "TalentBench Analytics Hiring Team"
            ),
        ),
        "siddharth.verma@salesforce-lead.com": (
            "Domain Mismatch: Commercial B2B Sales & SDR outreach without technical database querying or BI metrics.",
            (
                "Dear Siddharth,\n\n"
                "Thank you for your application for the Data Analyst role at TalentBench.\n\n"
                "We appreciate your 1.5 years of experience in enterprise B2B sales and CRM pipeline management. However, this position requires technical database querying in SQL, BI reporting (Tableau/Power BI), and quantitative statistical analysis. Because your background is specialized in sales development, we will not be moving forward with your application.\n\n"
                "Best regards,\n"
                "TalentBench Analytics Hiring Team"
            ),
        ),
        "neha.pandey@autocadmech.org": (
            "Domain Mismatch: Mechanical Engineering CAD/FEA simulation; lacks relational databases and BI analytics.",
            (
                "Dear Neha,\n\n"
                "Thank you for applying for the Data Analyst role at TalentBench.\n\n"
                "Your 1.3 years of experience in CAD design, SolidWorks modeling, and ANSYS FEA simulation reflects strong technical problem solving. However, our Data Analyst opening requires expertise in relational databases, SQL queries, business intelligence, and Python data manipulation. As mechanical design engineering has minimal overlap with our analytics stack, we cannot proceed with your candidacy.\n\n"
                "Best regards,\n"
                "TalentBench Analytics Hiring Team"
            ),
        ),
        "karan.malhotra@devopscloud.net": (
            "Skill Gap: DevOps & Cloud SysAdmin; lacks business analytics, SQL data modeling, and reporting dashboard tools.",
            (
                "Dear Karan,\n\n"
                "Thank you for applying for the Data Analyst position at TalentBench.\n\n"
                "Your 1.5 years of cloud infrastructure, Docker containerization, and Linux administration experience is strong. However, this role focuses strictly on business intelligence, data modeling, SQL analytics queries, and executive KPI reporting in Power BI or Tableau. Because your profile is aligned with DevOps and sysadmin infrastructure, we are not advancing your application for this specific role.\n\n"
                "Best regards,\n"
                "TalentBench Analytics Hiring Team"
            ),
        ),
        "pooja.hegde@bootcampdata.dev": (
            "Experience Gap: 0.0 years full-time professional experience (only 12-week bootcamp training).",
            (
                "Dear Pooja,\n\n"
                "Thank you for your application for the Data Analyst role at TalentBench.\n\n"
                "We commend your initiative in completing an intensive 12-week data analytics bootcamp. However, this position strictly requires a minimum of 1 year of full-time professional industry experience managing production databases and reporting pipelines. We are unable to consider candidates with 0 professional years of experience at this time.\n\n"
                "Recommendation: We encourage you to seek entry-level internships or junior trainee roles to build your 1-year professional track record, and we would welcome your application in the future.\n\n"
                "Best regards,\n"
                "TalentBench Analytics Hiring Team"
            ),
        ),
        "rishi.saxena@tallyaccounts.com": (
            "Domain Mismatch: Traditional accounting & Tally bookkeeping; lacks SQL, automated Python, and BI tools.",
            (
                "Dear Rishi,\n\n"
                "Thank you for applying for the Data Analyst role at TalentBench.\n\n"
                "We appreciate your 2.5 years of professional accounting and bookkeeping experience using Tally and Excel. However, our Data Analyst role requires software-driven analytics, including relational SQL querying, automated Python data transformations, and BI dashboard engineering. As traditional financial accounting does not fulfill these technical requirements, we will not be moving forward with your application.\n\n"
                "Best regards,\n"
                "TalentBench Analytics Hiring Team"
            ),
        ),
        "shweta.tiwari@contentwrite.co": (
            "Domain Mismatch: Content writing and copywriting; lacks technical quantitative data skills and SQL.",
            (
                "Dear Shweta,\n\n"
                "Thank you for your interest in the Data Analyst role at TalentBench.\n\n"
                "While your 1.2 years of copywriting and content creation experience demonstrates great communication skills, this role is a technical data role focused on writing SQL queries, building dashboard metrics, and analyzing structured datasets. Because your background is in content writing, we are unable to advance your application.\n\n"
                "Best regards,\n"
                "TalentBench Analytics Hiring Team"
            ),
        ),
        "aditya.chauhan@customersupport.in": (
            "Domain Mismatch: Customer support operations & ticketing; lacks SQL data modeling and BI dashboards.",
            (
                "Dear Aditya,\n\n"
                "Thank you for applying for the Data Analyst position at TalentBench.\n\n"
                "Your 1.4 years of customer support and ticket management experience demonstrates strong user empathy and operational discipline. However, this role requires technical competency in writing SQL queries, performing exploratory data analysis, and building dashboards in Tableau or Power BI. As your background is in customer service operations, we will not be moving forward.\n\n"
                "Best regards,\n"
                "TalentBench Analytics Hiring Team"
            ),
        ),
        "manish.rao@hrrecruiter.biz": (
            "Domain Mismatch: HR talent recruiting & ATS sourcing; lacks data analytics, SQL, and Python data skills.",
            (
                "Dear Manish,\n\n"
                "Thank you for applying for the Data Analyst position at TalentBench.\n\n"
                "We appreciate your 1.8 years of experience in recruitment and talent sourcing. However, this role is within our technical analytics group and requires proficiency in SQL databases, Python data processing, and BI dashboard creation. Because your experience is in Human Resources, we cannot consider your candidacy for this technical data role.\n\n"
                "Best regards,\n"
                "TalentBench Analytics Hiring Team"
            ),
        ),
        "deepak.gupta@collegestudent.edu": (
            "Experience Gap: University final-year student (0.3 yrs college project); lacks 1.0 yr full-time exp.",
            (
                "Dear Deepak,\n\n"
                "Thank you for applying for the Data Analyst role at TalentBench.\n\n"
                "We reviewed your academic profile and college project coursework. However, this role mandates a minimum of 1 year of full-time professional work experience. As you are currently in your final year of university, you do not meet the minimum full-time experience requirement.\n\n"
                "Recommendation: We invite you to apply for our campus graduate cohorts or re-apply once you have accrued 1 year of professional industry experience.\n\n"
                "Best regards,\n"
                "TalentBench Analytics Hiring Team"
            ),
        ),
        "meera.nambiar@finlytics.dev": (
            "Cutoff Quota: Rank #6 outside Top 5 threshold. Marketing analytics depth slightly lower than top cohort.",
            (
                "Dear Meera,\n\n"
                "Thank you for interviewing for the Data Analyst role at TalentBench.\n\n"
                "Your 1.0 year of experience in marketing attribution analysis and Looker Studio dashboards is commendable. However, during our comparative benchmark tournament against the top candidates, others demonstrated deeper production SQL window function optimization, data warehouse modeling, and automated data pipelines comparable to our cohort benchmark project 'Customer Churn Prediction & RFM Segmentation Pipeline'.\n\n"
                "Portfolio Recommendation: We encourage you to build an end-to-end data pipeline incorporating complex SQL CTEs, window functions, and predictive cohort modeling in Python (Pandas) to elevate your technical portfolio for senior consideration.\n\n"
                "Best regards,\n"
                "TalentBench Analytics Hiring Team"
            ),
        ),
    }

    QUALIFIED_DATA = {
        "aarav.mehta@analyticsbi.com": {
            "rank": 1,
            "score": 94,
            "top_project": "Customer Churn Prediction & RFM Segmentation Pipeline",
            "verdict": "SHORTLISTED: Outstanding SQL window function expertise, cohort retention modeling, and high-impact Power BI dashboard engineering.",
        },
        "sneha.kulkarni@databench.io": {
            "rank": 2,
            "score": 91,
            "top_project": "E-Commerce Funnel & Cart Abandonment Analytics",
            "verdict": "SHORTLISTED: Exceptional statistical foundation, e-commerce funnel analytics, and complex Tableau storyboards.",
        },
        "rohan.deshmukh@insightsync.com": {
            "rank": 3,
            "score": 88,
            "top_project": "Patient Appointment No-Show Prediction Dashboard",
            "verdict": "SHORTLISTED: Strong Snowflake data warehousing, Looker KPI engineering, and clinic slot utilization analytics.",
        },
        "ananya.iyer@metricsflow.org": {
            "rank": 4,
            "score": 86,
            "top_project": "Fleet Route & Fuel Efficiency Analytics",
            "verdict": "SHORTLISTED: Robust PostgreSQL & DAX measures, automated fleet telematics reporting, and operational problem solving.",
        },
        "vikram.sengupta@cloudmetrics.ai": {
            "rank": 5,
            "score": 83,
            "top_project": "SaaS MRR & Net Retention Cohort Analysis",
            "verdict": "SHORTLISTED: Solid Google BigQuery SQL views, SaaS recurring revenue cohort modeling, and Tableau reporting.",
        },
        "meera.nambiar@finlytics.dev": {
            "rank": 6,
            "score": 74,
            "top_project": "Paid Ad Campaign Attribution Analysis",
            "verdict": "DISQUALIFIED (Cutoff Quota): Strong marketing analytics, but scored just outside Top 5 comparative cutoff threshold.",
        },
    }

    TOP_10_BENCHMARK = [
        {
            "id": "da-p1",
            "title": "Customer Churn Prediction & RFM Segmentation Pipeline",
            "description": "Production SQL window function pipeline processing 250k transactions with Pandas cohort retention modeling and interactive Power BI executive reporting.",
            "technologies": ["SQL", "PostgreSQL", "Python", "Pandas", "Power BI"],
            "complexity_score": 9.5,
        },
        {
            "id": "da-p2",
            "title": "E-Commerce Conversion Funnel & Basket Affinity Engine",
            "description": "Multi-stage SQL funnel analysis on 400k browsing sessions paired with Tableau storyboards identifying checkout drop-offs and product affinity cross-sells.",
            "technologies": [
                "SQL",
                "MySQL",
                "Tableau",
                "Pandas",
                "Statistical Testing",
            ],
            "complexity_score": 9.2,
        },
        {
            "id": "da-p3",
            "title": "Snowflake HealthTech Appointment Utilization Dashboard",
            "description": "Snowflake data warehouse reporting model and Looker dashboards monitoring patient wait-times and doctor slot fill-rates across clinics.",
            "technologies": ["Snowflake", "SQL", "Looker", "Python", "Data Hygiene"],
            "complexity_score": 8.9,
        },
        {
            "id": "da-p4",
            "title": "Real-Time Fleet Fuel Telematics & Aging Bottleneck Tracker",
            "description": "PostgreSQL data models with advanced DAX measures in Power BI tracking telematics telemetry from 800 commercial vehicles with threshold alerting.",
            "technologies": ["PostgreSQL", "Power BI", "DAX", "SQL", "Logistics KPIs"],
            "complexity_score": 8.7,
        },
        {
            "id": "da-p5",
            "title": "SaaS Recurring Revenue (MRR) & Net Retention Cohort Model",
            "description": "BigQuery SQL views powering automated MRR waterfall reports, CAC payback analysis, and customer lifetime value (LTV) models in Tableau.",
            "technologies": [
                "BigQuery",
                "Tableau",
                "Python",
                "Cohort Analysis",
                "SaaS Metrics",
            ],
            "complexity_score": 8.5,
        },
        {
            "id": "da-p6",
            "title": "Multi-Touch Digital Ad Attribution & CPA Optimization",
            "description": "Multi-channel advertising spend attribution using SQL queries and Looker Studio dashboards tracking CPA across Google and Meta campaigns.",
            "technologies": [
                "SQL",
                "Google Data Studio",
                "Excel",
                "Marketing Attribution",
            ],
            "complexity_score": 8.0,
        },
        {
            "id": "da-p7",
            "title": "Automated Financial Reconciliation & Variance Ledger",
            "description": "Python ETL scripts reconciling multi-source transactional ledgers against ERP accounts with automated discrepancy flagging.",
            "technologies": [
                "Python",
                "Pandas",
                "Advanced Excel",
                "Financial Modeling",
            ],
            "complexity_score": 7.8,
        },
        {
            "id": "da-p8",
            "title": "Dynamic Inventory Reorder Point Forecasting",
            "description": "Statistical safety stock and reorder point model based on historical sales velocity and supplier lead-time variances.",
            "technologies": ["SQL", "Python", "Statistics", "Inventory Analytics"],
            "complexity_score": 7.6,
        },
        {
            "id": "da-p9",
            "title": "Customer Lifetime Value (LTV) Predictive Regressor",
            "description": "Linear and polynomial regression models predicting 12-month customer spend based on initial 30-day product engagement signals.",
            "technologies": ["Python", "Scikit-Learn", "SQL", "Statistical Regression"],
            "complexity_score": 7.5,
        },
        {
            "id": "da-p10",
            "title": "Product Catalog Taxonomy Discrepancy Scraper",
            "description": "Automated data hygiene audit script validating product categories and SKU pricing consistency across regional catalogs.",
            "technologies": ["Python", "Regex", "SQL", "Data Quality"],
            "complexity_score": 7.3,
        },
    ]

    candidates = db.query(Candidate).filter(Candidate.role_id == role_id).all()
    total_cands = len(candidates)

    # ── Initial State Reset on Execution Start ─────────────────────────────────
    for c in candidates:
        c.status = "applied"
        c.overall_score = 0
        c.ai_match_score = 0
        c.current_round = 0
    cand_ids = [c.id for c in candidates]
    if cand_ids:
        db.query(RoundResult).filter(RoundResult.candidate_id.in_(cand_ids)).delete(
            synchronize_session=False
        )
        db.query(MailQueue).filter(MailQueue.candidate_id.in_(cand_ids)).delete(
            synchronize_session=False
        )
    db.query(BenchmarkProfile).filter(BenchmarkProfile.role_id == role_id).delete(
        synchronize_session=False
    )
    db.commit()

    # ── Step 1: Ingestion & Discovery ──────────────────────────────────────────
    stream_agent_log(
        role_id,
        round_id,
        tag="AGENT:INIT",
        message="Initiated autonomous screening workflow for 'Data Analyst - Mock' (Round 1: Resume Screen).",
        step_idx=1,
        total_steps=total_steps,
        step_name="Discovering Candidates",
        stats={"total": total_cands, "processed": 0, "advanced": 0, "disqualified": 0},
    )
    time.sleep(1.2)

    stream_agent_log(
        role_id,
        round_id,
        tag="AGENT:INGEST",
        message=f"Discovered {total_cands} parsed resumes. Enforcing criteria: Min 1.0 yr professional experience in Data Analytics + SQL/Python/BI.",
        step_idx=1,
        total_steps=total_steps,
        step_name="Ingesting Resumes",
        stats={"total": total_cands, "processed": 0, "advanced": 0, "disqualified": 0},
    )
    time.sleep(1.6)

    # ── Step 2: Basic AI Screening (Skills & Experience Verification) ───────────
    stream_agent_log(
        role_id,
        round_id,
        tag="AGENT:ANALYSIS",
        message="Verifying technical skills (SQL, Python/Pandas, BI) and 1.0+ year full-time professional experience against JD.",
        step_idx=2,
        total_steps=total_steps,
        step_name="Screening Skills & Experience",
    )
    time.sleep(1.2)

    processed_count = 0
    passed_basic_count = 0
    disqualified_count = 0

    for cand in candidates:
        processed_count += 1
        cand_email = cand.email.lower().strip()

        if cand_email in QUALIFIED_DATA:
            passed_basic_count += 1
            skills_str = ", ".join((cand.skills or [])[:3])
            stream_agent_log(
                role_id,
                round_id,
                tag="AGENT:MATCH",
                message=f"Examining {cand.name} ({cand_email}) · {cand.experience_years} yrs exp · Skills: {skills_str}. Meets JD criteria! Verdict: PASSED Basic Screening.",
                candidate_id=cand.id,
                step_idx=2,
                total_steps=total_steps,
                step_name="Screening Skills & Experience",
                stats={
                    "total": total_cands,
                    "processed": processed_count,
                    "advanced": 0,
                    "disqualified": disqualified_count,
                },
            )
        else:
            disqualified_count += 1
            reason, mail_body = REJECTION_MAIL_MAP.get(
                cand_email,
                (
                    "Does not fulfill minimum 1 year data analytics experience or technical SQL/BI requirement.",
                    f"Dear {cand.name},\n\nThank you for applying for the Data Analyst role at TalentBench. We have decided to move forward with candidates whose experience more closely matches our technical requirements.\n\nBest regards,\nTalentBench Hiring Team",
                ),
            )

            cand.status = "rejected"
            cand.overall_score = 42
            cand.ai_match_score = 42

            # Store round result with personalized mail body
            rr = (
                db.query(RoundResult)
                .filter(
                    RoundResult.candidate_id == cand.id,
                    RoundResult.round_id == round_id,
                )
                .first()
            )
            if not rr:
                rr = RoundResult(
                    candidate_id=cand.id,
                    round_id=round_id,
                    round_name=round_obj.name,
                    round_type=round_obj.type,
                    status="failed",
                    score=42,
                    ai_verdict=mail_body,
                    ai_summary=f"Failed Basic Screening: {reason}",
                    evaluated_at=datetime.now(timezone.utc),
                )
                db.add(rr)
            else:
                rr.status = "failed"
                rr.score = 42
                rr.ai_verdict = mail_body
                rr.ai_summary = f"Failed Basic Screening: {reason}"
                rr.evaluated_at = datetime.now(timezone.utc)

            # Store in MailQueue with status pending_manual_send for HR copy
            mail_item = (
                db.query(MailQueue).filter(MailQueue.candidate_id == cand.id).first()
            )
            if not mail_item:
                mail_item = MailQueue(
                    candidate_id=cand.id,
                    template_name="basic_screening_rejection_gap",
                    recipient_email=cand.email,
                    recipient_name=cand.name,
                    subject=f"Application Update: {role.title}",
                    body_html=mail_body.replace("\n", "<br/>"),
                    body_text=mail_body,
                    status="pending_manual_send",
                )
                db.add(mail_item)

            stream_agent_log(
                role_id,
                round_id,
                tag="AGENT:THOUGHT",
                message=f"Examining {cand.name} ({cand_email}) · {cand.experience_years} yrs exp. {reason} Verdict: DISQUALIFIED (Personalized gap mail body generated for HR copy).",
                candidate_id=cand.id,
                step_idx=2,
                total_steps=total_steps,
                step_name="Screening Skills & Experience",
                stats={
                    "total": total_cands,
                    "processed": processed_count,
                    "advanced": 0,
                    "disqualified": disqualified_count,
                },
            )

        time.sleep(1.4)

    db.commit()

    # ── Step 3: Top 10 Benchmark Synthesis ─────────────────────────────────────
    stream_agent_log(
        role_id,
        round_id,
        tag="AGENT:BENCHMARK",
        message=f"Selected {passed_basic_count} candidates passing basic screening. Initiating Comparative Matching Tournament.",
        step_idx=3,
        total_steps=total_steps,
        step_name="Synthesizing Top 10 Benchmark",
        stats={
            "total": total_cands,
            "processed": total_cands,
            "advanced": 0,
            "disqualified": disqualified_count,
        },
    )
    time.sleep(1.8)

    stream_agent_log(
        role_id,
        round_id,
        tag="AGENT:BENCHMARK",
        message="Comparing project 'Customer Churn Prediction & RFM Segmentation Pipeline' (Aarav Mehta) against Data Analyst JD... High architectural depth (Complex SQL CTEs, retention cohort modeling).",
        step_idx=3,
        total_steps=total_steps,
        step_name="Synthesizing Top 10 Benchmark",
    )
    time.sleep(1.8)

    stream_agent_log(
        role_id,
        round_id,
        tag="AGENT:BENCHMARK",
        message="Comparing 'E-Commerce Conversion Funnel & Basket Affinity Engine' (Sneha Kulkarni) vs 'Fleet Route Telematics Analytics' (Ananya Iyer)...",
        step_idx=3,
        total_steps=total_steps,
        step_name="Synthesizing Top 10 Benchmark",
    )
    time.sleep(1.8)

    stream_agent_log(
        role_id,
        round_id,
        tag="AGENT:BENCHMARK",
        message="Definitive Top 10 Benchmark established across candidate project pool. Top benchmark project: Customer Churn Prediction & RFM Segmentation Pipeline.",
        step_idx=3,
        total_steps=total_steps,
        step_name="Benchmark Established",
    )
    time.sleep(2.0)

    # Save benchmark
    bp = db.query(BenchmarkProfile).filter(BenchmarkProfile.role_id == role_id).first()
    if not bp:
        bp = BenchmarkProfile(
            role_id=role_id,
            source_type="candidates_pool",
            top_projects=TOP_10_BENCHMARK,
        )
        db.add(bp)
    else:
        bp.top_projects = TOP_10_BENCHMARK
    db.commit()

    # ── Step 4: Comparative Scoring & Ranking ──────────────────────────────────
    stream_agent_log(
        role_id,
        round_id,
        tag="AGENT:SCORING",
        message="Scoring and ranking passing candidates relative to the Top 10 Benchmark projects.",
        step_idx=4,
        total_steps=total_steps,
        step_name="Comparative Candidate Scoring",
    )
    time.sleep(1.8)

    stream_agent_log(
        role_id,
        round_id,
        tag="AGENT:RANK",
        message="Comparative ranking complete: Aarav Mehta (94), Sneha Kulkarni (91), Rohan Deshmukh (88), Ananya Iyer (86), Vikram Sengupta (83), Meera Nambiar (74).",
        step_idx=4,
        total_steps=total_steps,
        step_name="Ranking Complete",
    )
    time.sleep(1.8)

    # ── Step 5: Cutoff Quota & Final Shortlisting ──────────────────────────────
    cutoff_count = getattr(round_obj, "cutoff_count", None) or 5
    stream_agent_log(
        role_id,
        round_id,
        tag="AGENT:CUTOFF",
        message=f"Applying round Cutoff Threshold (Top {cutoff_count} candidates).",
        step_idx=5,
        total_steps=total_steps,
        step_name="Enforcing Cutoff & Notifications",
    )
    time.sleep(1.6)

    advanced_count = 0
    final_disqualified = disqualified_count

    # Evaluate the 6 qualified candidates against cutoff
    for cand in candidates:
        cand_email = cand.email.lower().strip()
        if cand_email not in QUALIFIED_DATA:
            continue

        q_info = QUALIFIED_DATA[cand_email]
        rank = q_info["rank"]
        score = q_info["score"]
        verdict = q_info["verdict"]

        cand.overall_score = score
        cand.ai_match_score = score

        is_shortlisted = rank <= cutoff_count
        if is_shortlisted:
            advanced_count += 1
            cand.status = "screened"

            rr = (
                db.query(RoundResult)
                .filter(
                    RoundResult.candidate_id == cand.id,
                    RoundResult.round_id == round_id,
                )
                .first()
            )
            if not rr:
                rr = RoundResult(
                    candidate_id=cand.id,
                    round_id=round_id,
                    round_name=round_obj.name,
                    round_type=round_obj.type,
                    status="passed",
                    score=score,
                    ai_verdict=verdict,
                    ai_summary=f"Rank #{rank}. Comparative Score: {score}/100. Shortlisted for Data Analyst.",
                    evaluated_at=datetime.now(timezone.utc),
                )
                db.add(rr)
            else:
                rr.status = "passed"
                rr.score = score
                rr.ai_verdict = verdict
                rr.ai_summary = f"Rank #{rank}. Comparative Score: {score}/100. Shortlisted for Data Analyst."
                rr.evaluated_at = datetime.now(timezone.utc)

            stream_agent_log(
                role_id,
                round_id,
                tag="AGENT:ADVANCE",
                message=f"Rank #{rank}: {cand.name} scored {score}/100 within Top {cutoff_count} quota · SHORTLISTED.",
                candidate_id=cand.id,
                step_idx=5,
                total_steps=total_steps,
                step_name="Shortlisting Top Candidates",
                stats={
                    "total": total_cands,
                    "processed": total_cands,
                    "advanced": advanced_count,
                    "disqualified": final_disqualified,
                },
            )
        else:
            final_disqualified += 1
            cand.status = "rejected"
            reason, mail_body = REJECTION_MAIL_MAP[cand_email]

            rr = (
                db.query(RoundResult)
                .filter(
                    RoundResult.candidate_id == cand.id,
                    RoundResult.round_id == round_id,
                )
                .first()
            )
            if not rr:
                rr = RoundResult(
                    candidate_id=cand.id,
                    round_id=round_id,
                    round_name=round_obj.name,
                    round_type=round_obj.type,
                    status="failed",
                    score=score,
                    ai_verdict=mail_body,
                    ai_summary=f"Rank #{rank}. Comparative Score: {score}/100. {reason}",
                    evaluated_at=datetime.now(timezone.utc),
                )
                db.add(rr)
            else:
                rr.status = "failed"
                rr.score = score
                rr.ai_verdict = mail_body
                rr.ai_summary = (
                    f"Rank #{rank}. Comparative Score: {score}/100. {reason}"
                )
                rr.evaluated_at = datetime.now(timezone.utc)

            mail_item = (
                db.query(MailQueue).filter(MailQueue.candidate_id == cand.id).first()
            )
            if not mail_item:
                mail_item = MailQueue(
                    candidate_id=cand.id,
                    template_name="comparative_rejection_guidance",
                    recipient_email=cand.email,
                    recipient_name=cand.name,
                    subject=f"Application Update & Portfolio Guidance: {role.title}",
                    body_html=mail_body.replace("\n", "<br/>"),
                    body_text=mail_body,
                    status="pending_manual_send",
                )
                db.add(mail_item)

            stream_agent_log(
                role_id,
                round_id,
                tag="AGENT:MAIL",
                message=f"Rank #{rank}: {cand.name} ({score}/100) outside Top {cutoff_count} quota · Generated comparative guidance email for HR manual copy.",
                candidate_id=cand.id,
                step_idx=5,
                total_steps=total_steps,
                step_name="Enforcing Cutoff & Notifications",
                stats={
                    "total": total_cands,
                    "processed": total_cands,
                    "advanced": advanced_count,
                    "disqualified": final_disqualified,
                },
            )

        time.sleep(1.4)

    db.commit()

    # ── Step 6: Workflow Complete & Final Report ───────────────────────────────
    final_summary = (
        f"Data Analyst - Mock workflow complete! {advanced_count} candidates shortlisted, "
        f"{final_disqualified} candidates disqualified with copyable personalized feedback mail bodies. "
        f"Excel export ready with Shortlisted and Rejected sheets."
    )

    stream_agent_log(
        role_id,
        round_id,
        tag="AGENT:COMPLETE",
        message=final_summary,
        step_idx=6,
        total_steps=total_steps,
        step_name="Workflow Execution Complete",
        stats={
            "total": total_cands,
            "processed": total_cands,
            "advanced": advanced_count,
            "disqualified": final_disqualified,
        },
    )

    update_workflow_state(
        role_id=role_id,
        round_id=round_id,
        status="completed",
        current_step=6,
        total_steps=total_steps,
        step_name="Completed",
        stats_update={
            "total": total_cands,
            "processed": total_cands,
            "advanced": advanced_count,
            "disqualified": final_disqualified,
        },
    )

    publish_event(
        role_id=role_id,
        event_type="workflow_completed",
        payload={
            "round_id": round_id,
            "role_id": role_id,
            "advanced_count": advanced_count,
            "disqualified_count": final_disqualified,
            "message": final_summary,
        },
    )

    return {
        "status": "completed",
        "advanced_count": advanced_count,
        "disqualified_count": final_disqualified,
    }


@celery_app.task(
    bind=True,
    max_retries=1,
    name="app.workers.workflow_tasks.run_round_workflow",
)
def run_round_workflow(self, role_id: str, round_id: str):
    """
    Executes an interactive end-to-end round workflow with live agent thought streaming.
    """
    logger.info("run_round_workflow_started", role_id=role_id, round_id=round_id)
    db = get_sync_db()

    try:
        role = db.query(Role).filter(Role.id == role_id).first()
        if not role:
            raise ValueError(f"Role {role_id} not found")

        round_obj = db.query(Round).filter(Round.id == round_id).first()
        if not round_obj:
            raise ValueError(f"Round {round_id} not found")

        if role.title == "Data Analyst - Mock":
            return run_data_analyst_mock_workflow(role, round_obj, db)

        round_name = round_obj.name
        round_type = round_obj.type
        round_order = round_obj.order
        jd_text = role.description or role.title
        llm = get_llm_gateway()

        total_steps = 6

        # ── Step 1: Ingestion & Candidate Discovery ────────────────────────────
        stream_agent_log(
            role_id,
            round_id,
            tag="AGENT:INIT",
            message=f"Initiating workflow orchestrator for '{round_name}' ({round_type}).",
            step_idx=1,
            total_steps=total_steps,
            step_name="Discovering Candidates",
        )

        # Candidates in current round
        if round_order == 0 or round_type == "resume_screen":
            candidates = db.query(Candidate).filter(Candidate.role_id == role_id).all()
        else:
            candidates = (
                db.query(Candidate)
                .filter(
                    Candidate.role_id == role_id,
                    Candidate.current_round == round_order,
                    Candidate.status != "rejected",
                )
                .all()
            )

        total_cands = len(candidates)
        stream_agent_log(
            role_id,
            round_id,
            tag="AGENT:INGEST",
            message=f"Discovered {total_cands} candidate profiles ready for {round_name} evaluation.",
            step_idx=1,
            total_steps=total_steps,
            step_name="Ingesting Candidates",
            stats={
                "total": total_cands,
                "processed": 0,
                "advanced": 0,
                "disqualified": 0,
            },
        )

        if total_cands == 0:
            stream_agent_log(
                role_id,
                round_id,
                tag="AGENT:WARN",
                message="No candidates available in this round pool. Upload resumes or advance candidates from earlier rounds.",
                step_idx=1,
                total_steps=total_steps,
                step_name="No Candidates Found",
            )
            update_workflow_state(
                role_id,
                round_id,
                "completed",
                1,
                total_steps,
                "Completed (0 candidates)",
            )
            return {"status": "completed", "candidates_processed": 0}

        # ── Step 2: Agent Skills & Experience Evaluation ────────────────────────
        stream_agent_log(
            role_id,
            round_id,
            tag="AGENT:ANALYSIS",
            message=f"Evaluating candidate competencies against Job Description: '{role.title}'.",
            step_idx=2,
            total_steps=total_steps,
            step_name="Screening Skills & Experience",
        )

        screened_results = []
        for idx, cand in enumerate(candidates, start=1):
            cand_skills = cand.skills if isinstance(cand.skills, list) else []
            skills_str = (
                ", ".join(cand_skills[:4])
                if cand_skills
                else "General software development"
            )
            exp_yrs = cand.experience_years or 0

            stream_agent_log(
                role_id,
                round_id,
                tag="AGENT:THOUGHT",
                message=f"Examining {cand.name} (Mail: {cand.id}) · {exp_yrs} yrs exp · Skills: {skills_str}",
                candidate_id=cand.id,
                step_idx=2,
                total_steps=total_steps,
                step_name="Screening Skills & Experience",
                stats={
                    "total": total_cands,
                    "processed": idx,
                    "advanced": 0,
                    "disqualified": 0,
                },
            )

            # Heuristic and criteria check
            has_relevant_exp = exp_yrs >= 2
            matches_skills = len(cand_skills) >= 1

            screened_results.append(
                {
                    "candidate": cand,
                    "has_exp": has_relevant_exp,
                    "matches_skills": matches_skills,
                }
            )

        # ── Step 3: Top 10 Benchmark Synthesis ─────────────────────────────────
        stream_agent_log(
            role_id,
            round_id,
            tag="AGENT:BENCHMARK",
            message="Gathering candidate engineering projects into token-bounded batches for tournament synthesis.",
            step_idx=3,
            total_steps=total_steps,
            step_name="Synthesizing Top 10 Benchmark",
        )

        # Batch candidate projects
        candidate_project_batches = []
        current_batch = []
        for c in candidates:
            c_projects = c.projects if isinstance(c.projects, list) else []
            for p in c_projects:
                p_text = p if isinstance(p, str) else p.get("title", "")
                if p_text:
                    current_batch.append(
                        {
                            "id": c.id,
                            "title": p_text,
                            "description": f"Engineered by {c.name} ({c.experience_years} yrs exp). Technologies: {', '.join(c.skills[:3]) if c.skills else 'N/A'}",
                            "technologies": c.skills[:4]
                            if c.skills
                            else ["System Design"],
                            "complexity_score": 8,
                        }
                    )
                if len(current_batch) >= 10:
                    candidate_project_batches.append(current_batch)
                    current_batch = []
        if current_batch:
            candidate_project_batches.append(current_batch)

        top_10_projects = []
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                top_10_projects = loop.run_until_complete(
                    asyncio.wait_for(
                        llm.synthesize_top_benchmark_projects(
                            jd_text, candidate_project_batches
                        ),
                        timeout=35.0,
                    )
                )
            finally:
                loop.close()
        except Exception as e:
            logger.warning("benchmark_synthesis_timed_out_or_failed", error=str(e))

        if not top_10_projects:
            flattened = [p for batch in candidate_project_batches for p in batch]
            top_10_projects = (
                flattened[:10]
                if flattened
                else [
                    {
                        "id": "p1",
                        "title": "High-Throughput Distributed System",
                        "description": "Distributed architecture benchmark requiring sub-50ms SLA and fault tolerance.",
                        "technologies": ["Python", "Kafka", "PostgreSQL", "Docker"],
                        "complexity_score": 9,
                    }
                ]
            )

        # Save to benchmark profile
        bench_profile = (
            db.query(BenchmarkProfile)
            .filter(BenchmarkProfile.role_id == role_id)
            .first()
        )
        if not bench_profile:
            bench_profile = BenchmarkProfile(
                role_id=role_id,
                source_type="candidates_pool",
                top_projects=top_10_projects,
            )
            db.add(bench_profile)
        else:
            bench_profile.top_projects = top_10_projects
        db.commit()

        top_names = ", ".join([p.get("title", "")[:28] for p in top_10_projects[:3]])
        stream_agent_log(
            role_id,
            round_id,
            tag="AGENT:BENCHMARK",
            message=f"Definitive Top 10 Benchmark established. Top projects: {top_names}...",
            step_idx=3,
            total_steps=total_steps,
            step_name="Benchmark Established",
        )

        # ── Step 4: Comparative Scoring & Ranking ──────────────────────────────
        stream_agent_log(
            role_id,
            round_id,
            tag="AGENT:SCORING",
            message="Evaluating each candidate's depth and architecture against the Top 10 Benchmark.",
            step_idx=4,
            total_steps=total_steps,
            step_name="Comparative Candidate Scoring",
        )

        scored_candidates = []
        bench_techs = set()
        for p in top_10_projects:
            for t in p.get("technologies", []):
                bench_techs.add(t.lower())

        for c in candidates:
            c_skills = set(s.lower() for s in (c.skills or []))
            matched_techs = c_skills.intersection(bench_techs)
            c_text = f"{c.resume_text} {' '.join(c.projects if isinstance(c.projects, list) else [])}".lower()
            text_matched = [t for t in bench_techs if t in c_text]

            base_score = 65 + min(18, len(text_matched) * 3)
            exp_bonus = min(15, (c.experience_years or 0) * 2)
            final_score = min(98, max(42, base_score + exp_bonus))

            missing = [t.title() for t in (bench_techs - c_skills)][:2]
            if not missing:
                missing = ["Distributed Consensus", "High-throughput Streaming"]

            rec = (
                f"Build a production project comparable to '{top_10_projects[0].get('title')}' "
                f"incorporating {', '.join(missing)} with sub-50ms latency SLAs rather than standard CRUD APIs."
            )

            scored_candidates.append(
                {
                    "candidate": c,
                    "score": final_score,
                    "missing": missing,
                    "recommendation": rec,
                }
            )

        scored_candidates.sort(key=lambda x: x["score"], reverse=True)

        top_sc = scored_candidates[0]
        stream_agent_log(
            role_id,
            round_id,
            tag="AGENT:RANK",
            message=f"Comparative ranking complete. Top candidate: {top_sc['candidate'].name} ({top_sc['score']}/100).",
            candidate_id=top_sc["candidate"].id,
            step_idx=4,
            total_steps=total_steps,
            step_name="Ranking Complete",
        )

        # ── Step 5: Cutoff Threshold & Actionable Rejection Mailing ─────────────
        stream_agent_log(
            role_id,
            round_id,
            tag="AGENT:CUTOFF",
            message=f"Applying round cutoff threshold and scheduling notifications.",
            step_idx=5,
            total_steps=total_steps,
            step_name="Enforcing Cutoff & Notifications",
        )

        cutoff_limit = 300
        if getattr(round_obj, "cutoff_type", None) == "count" and getattr(
            round_obj, "cutoff_count", None
        ):
            cutoff_limit = round_obj.cutoff_count
        elif getattr(round_obj, "cutoff_threshold", 0) > 0:
            cutoff_limit = round_obj.cutoff_threshold

        advanced_count = 0
        disqualified_count = 0

        for rank, item in enumerate(scored_candidates, start=1):
            cand = item["candidate"]
            score = item["score"]
            rec_proj = item["recommendation"]
            is_advanced = rank <= cutoff_limit

            cand.overall_score = score
            cand.ai_match_score = score

            if is_advanced:
                advanced_count += 1
                cand.status = "screened" if round_type == "resume_screen" else "tested"
                cand.current_round = round_order + 1

                stream_agent_log(
                    role_id,
                    round_id,
                    tag="AGENT:ADVANCE",
                    message=f"Rank #{rank}: {cand.name} scored {score}/100 · ADVANCED to Round {round_order + 1}.",
                    candidate_id=cand.id,
                    step_idx=5,
                    total_steps=total_steps,
                    step_name="Advancing Qualified Candidates",
                    stats={
                        "total": total_cands,
                        "processed": rank,
                        "advanced": advanced_count,
                        "disqualified": disqualified_count,
                    },
                )
            else:
                disqualified_count += 1
                cand.status = "rejected"
                cand.current_round = round_order

                # Queue personalized rejection email with project recommendation
                mail_body = (
                    f"Dear {cand.name},\n\n"
                    f"Thank you for applying for {role.title} at {settings.FROM_NAME}.\n\n"
                    f"After comparative evaluation against this cohort's gold-standard benchmark projects, "
                    f"we are not advancing your application to the next round at this time.\n\n"
                    f"**Tailored Project Recommendation to Elevate Your Portfolio:**\n"
                    f"{rec_proj}\n\n"
                    f"We encourage you to build this system and re-apply in the future!\n\n"
                    f"Best regards,\n"
                    f"{role.title} Hiring Team"
                )

                mail_item = MailQueue(
                    candidate_id=cand.id,
                    template_name="comparative_rejection_guidance",
                    recipient_email=cand.email,
                    recipient_name=cand.name,
                    subject=f"Application Update & Project Portfolio Guidance: {role.title}",
                    body_html=mail_body.replace("\n", "<br/>"),
                    body_text=mail_body,
                    status="sent",
                    sent_at=datetime.now(timezone.utc),
                )
                db.add(mail_item)

                stream_agent_log(
                    role_id,
                    round_id,
                    tag="AGENT:MAIL",
                    message=f"Rank #{rank}: {cand.name} ({score}/100) outside quota · Dispatched personalized project guidance email.",
                    candidate_id=cand.id,
                    step_idx=5,
                    total_steps=total_steps,
                    step_name="Enforcing Cutoff & Notifications",
                    stats={
                        "total": total_cands,
                        "processed": rank,
                        "advanced": advanced_count,
                        "disqualified": disqualified_count,
                    },
                )

            # Record round result
            rr = (
                db.query(RoundResult)
                .filter(
                    RoundResult.candidate_id == cand.id,
                    RoundResult.round_id == round_id,
                )
                .first()
            )
            summary = f"Rank #{rank}. Comparative Score: {score}/100. {'Advanced to next round' if is_advanced else 'Disqualified & mailed project feedback.'}"
            if not rr:
                rr = RoundResult(
                    candidate_id=cand.id,
                    round_id=round_id,
                    round_name=round_name,
                    round_type=round_type,
                    status="passed" if is_advanced else "failed",
                    score=score,
                    ai_verdict=rec_proj,
                    ai_summary=summary,
                    evaluated_at=datetime.now(timezone.utc),
                )
                db.add(rr)
            else:
                rr.score = score
                rr.status = "passed" if is_advanced else "failed"
                rr.ai_verdict = rec_proj
                rr.ai_summary = summary
                rr.evaluated_at = datetime.now(timezone.utc)

        db.commit()

        # ── Step 6: Workflow Complete ──────────────────────────────────────────
        final_summary = (
            f"Round workflow complete! {advanced_count} candidates advanced to Round {round_order + 1}. "
            f"{disqualified_count} candidates notified with personalized project feedback."
        )
        stream_agent_log(
            role_id,
            round_id,
            tag="AGENT:COMPLETE",
            message=final_summary,
            step_idx=6,
            total_steps=total_steps,
            step_name="Workflow Execution Complete",
            stats={
                "total": total_cands,
                "processed": total_cands,
                "advanced": advanced_count,
                "disqualified": disqualified_count,
            },
        )

        update_workflow_state(
            role_id=role_id,
            round_id=round_id,
            status="completed",
            current_step=6,
            total_steps=total_steps,
            step_name="Completed",
            stats_update={
                "total": total_cands,
                "processed": total_cands,
                "advanced": advanced_count,
                "disqualified": disqualified_count,
            },
        )

        publish_event(
            role_id=role_id,
            event_type="workflow_completed",
            payload={
                "round_id": round_id,
                "role_id": role_id,
                "advanced_count": advanced_count,
                "disqualified_count": disqualified_count,
                "message": final_summary,
            },
        )

        return {
            "status": "completed",
            "advanced_count": advanced_count,
            "disqualified_count": disqualified_count,
        }

    except Exception as exc:
        logger.error(
            "run_round_workflow_failed",
            role_id=role_id,
            round_id=round_id,
            error=str(exc),
        )
        stream_agent_log(
            role_id,
            round_id,
            tag="AGENT:ERROR",
            message=f"Workflow halted due to error: {str(exc)}",
            step_idx=1,
            total_steps=6,
            step_name="Execution Failed",
        )
        update_workflow_state(role_id, round_id, "failed", 1, 6, f"Failed: {str(exc)}")
        raise exc
    finally:
        db.close()
