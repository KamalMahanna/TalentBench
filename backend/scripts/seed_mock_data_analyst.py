import asyncio
import uuid
from datetime import datetime, timezone
import json
from sqlalchemy import select, delete
from app.database import AsyncSessionLocal
from app.models import (
    Candidate,
    Organization,
    Role,
    Round,
    RoundResult,
    BenchmarkProfile,
    MailQueue,
    AuditLog,
    JobStatus,
)

# ── 20 Realistic Candidate Resumes ─────────────────────────────────────────────
# ~70% (14 candidates) have skill mismatches or lack 1 full-time year of data analytics experience
# 6 candidates have 1.0 - 1.5 yrs relevant data analytics experience

MOCK_CANDIDATES = [
    # ── Group 1: Passing Basic Screening (6 Candidates) ────────────────────────
    {
        "name": "Aarav Mehta",
        "email": "aarav.mehta@analyticsbi.com",
        "phone": "+91 98201 45678",
        "location": "Bangalore, IN",
        "experience_years": 1.4,
        "current_company": "Fintech Solutions India",
        "education": "B.Tech in Computer Science, VIT Vellore (2024)",
        "skills": [
            "SQL",
            "PostgreSQL",
            "Python",
            "Pandas",
            "Power BI",
            "Tableau",
            "Excel Modeling",
        ],
        "projects": [
            "Customer Churn Prediction & RFM Segmentation Pipeline: Built end-to-end automated pipeline processing 250k transactions using SQL window functions, cohort retention modeling in Pandas, and interactive Power BI executive dashboard.",
            "Lending Risk & Delinquency Dashboard: Created weekly SQL ETL models tracking 90-day delinquency rates across 40k credit lines with automated discrepancy alerts.",
        ],
        "resume_text": """AARAV MEHTA
Email: aarav.mehta@analyticsbi.com | Phone: +91 98201 45678 | Bangalore, IN
LinkedIn: linkedin.com/in/aaravmehta-bi | GitHub: github.com/aarav-analytics

SUMMARY
Results-oriented Junior Data Analyst with 1.4 years of full-time experience in fintech analytics. Proven expertise in writing complex SQL queries (CTEs, window functions, indexing), performing cohort analysis in Python (Pandas/NumPy), and designing high-impact executive dashboards in Power BI and Tableau.

EXPERIENCE
Junior Data Analyst | Fintech Solutions India, Bangalore | July 2024 - Present
- Formulated and optimized 40+ complex PostgreSQL queries to extract customer transaction trends from 5M+ row datasets.
- Developed executive Power BI dashboards monitoring daily active users, loan disbursement volume, and default rates for VP of Operations.
- Executed customer RFM (Recency, Frequency, Monetary) segmentation using Python (Pandas, Scikit-learn), identifying high-churn risk cohorts and improving retention by 7%.
- Automated manual weekly reconciliation spreadsheets using Python ETL scripts, saving 8 engineering hours per week.

EDUCATION
B.Tech in Computer Science & Engineering | VIT Vellore | 2020 - 2024 | CGPA: 8.7/10

TECHNICAL SKILLS
- Querying & Warehousing: PostgreSQL, MySQL, CTEs, Window Functions, Query Optimization
- Data Analysis & Modeling: Python (Pandas, NumPy, Matplotlib, Seaborn), Advanced Excel (VLOOKUP, INDEX/MATCH, Pivot Tables)
- Business Intelligence: Power BI (DAX, Data Modeling), Tableau Desktop
- Version Control & Tools: Git, Jira, Confluence, Linux basics
""",
    },
    {
        "name": "Sneha Kulkarni",
        "email": "sneha.kulkarni@databench.io",
        "phone": "+91 97312 88901",
        "location": "Pune, IN",
        "experience_years": 1.2,
        "current_company": "OmniRetail eCommerce",
        "education": "B.Sc in Statistics & Data Science, Ferguson College Pune (2024)",
        "skills": [
            "SQL",
            "MySQL",
            "Python",
            "Pandas",
            "Tableau",
            "Advanced Excel",
            "A/B Testing",
        ],
        "projects": [
            "E-Commerce Funnel & Cart Abandonment Analytics: Formulated SQL funnel analysis on 400k browsing sessions and designed Tableau storyboards identifying a 14% drop-off at payment checkout.",
            "Product Recommendation Cross-Sell Engine: Analyzed basket purchase affinities using Pandas and Apriori association algorithms, boosting multi-item basket conversions.",
        ],
        "resume_text": """SNEHA KULKARNI
Email: sneha.kulkarni@databench.io | Phone: +91 97312 88901 | Pune, IN

PROFESSIONAL SUMMARY
Data Analyst with 1.2 years of experience at a fast-growing e-commerce platform. Strong statistical foundation with hands-on proficiency in SQL data extraction, Tableau dashboard development, exploratory data analysis with Pandas, and A/B test hypothesis evaluation.

PROFESSIONAL EXPERIENCE
Data Analyst | OmniRetail eCommerce, Pune | Sept 2024 - Present
- Authored daily operational SQL scripts to analyze cart abandonment rates across 12 product categories.
- Built interactive Tableau storyboards used by Marketing and Category heads to monitor flash sales GMV.
- Conducted hypothesis testing (two-sample t-tests, chi-square) to measure impact of UI checkout redesigns.
- Cleaned and transformed unnormalized CSV exports using Pandas and regex for clean data warehouse ingestion.

EDUCATION
B.Sc in Statistics & Data Analytics | Ferguson College, Pune | 2021 - 2024

SKILLS
- Statistical Analysis: A/B Testing, Regression Analysis, Hypothesis Testing, Cohort Analysis
- Technical: SQL (MySQL, PostgreSQL), Python (Pandas, SciPy, Matplotlib), Tableau, Advanced Excel
""",
    },
    {
        "name": "Rohan Deshmukh",
        "email": "rohan.deshmukh@insightsync.com",
        "phone": "+91 98450 11234",
        "location": "Mumbai, IN",
        "experience_years": 1.5,
        "current_company": "CareFirst HealthTech",
        "education": "B.E in Information Technology, Mumbai University (2024)",
        "skills": [
            "SQL",
            "Snowflake",
            "Looker",
            "Python",
            "Excel",
            "Data Cleaning",
            "ETL",
        ],
        "projects": [
            "Patient Appointment No-Show Prediction Dashboard: Analyzed 150k patient consultation records using Snowflake SQL and Looker dashboards to identify appointment cancelation drivers.",
            "Doctor Utilization & Slot Optimization: Formulated capacity utilization metrics in Python, boosting doctor clinic slot fill-rates by 18%.",
        ],
        "resume_text": """ROHAN DESHMUKH
Email: rohan.deshmukh@insightsync.com | Phone: +91 98450 11234 | Mumbai, IN

SUMMARY
Analytical and detail-oriented Data Analyst with 1.5 years experience in healthcare analytics. Skilled in Snowflake SQL, Looker dashboard engineering, Python data transformations, and operational KPI reporting.

WORK EXPERIENCE
Data Analyst | CareFirst HealthTech, Mumbai | July 2024 - Present
- Queried large Snowflake data warehouses to extract diagnostic and appointment metrics for regional clinics.
- Designed and maintained Looker dashboards tracking patient wait-times, cancellations, and doctor utilization.
- Built automated data hygiene pipelines in Python using Pandas to detect missing diagnostic codes.
- Collaborated closely with medical operations teams to translate clinical KPIs into actionable visual reports.

EDUCATION
B.E. Information Technology | Mumbai University | 2020 - 2024
""",
    },
    {
        "name": "Ananya Iyer",
        "email": "ananya.iyer@metricsflow.org",
        "phone": "+91 99012 34567",
        "location": "Chennai, IN",
        "experience_years": 1.1,
        "current_company": "LogiTrans Express",
        "education": "B.Tech in Industrial & Systems Engineering, Anna University (2024)",
        "skills": [
            "SQL",
            "PostgreSQL",
            "Power BI",
            "Python",
            "Pandas",
            "DAX",
            "Supply Chain Analytics",
        ],
        "projects": [
            "Fleet Route & Fuel Efficiency Analytics: Processed telematics telemetry from 800 commercial vehicles using PostgreSQL and Power BI, saving 4.5% fleet fuel overhead.",
            "Warehouse Fulfillment Bottleneck Tracker: Built real-time order aging dashboards with automated threshold alerts for fulfillment managers.",
        ],
        "resume_text": """ANANYA IYER
Email: ananya.iyer@metricsflow.org | Phone: +91 99012 34567 | Chennai, IN

EXPERIENCE
Junior Operations Data Analyst | LogiTrans Express, Chennai | August 2024 - Present
- Extracted and transformed warehouse logistics data using SQL and Python.
- Engineered 12 Power BI dashboards featuring DAX measures to track on-time delivery rates.
- Partnered with supply chain managers to conduct root-cause analysis on transit delays.

EDUCATION
B.Tech Industrial Engineering | Anna University | 2020 - 2024
""",
    },
    {
        "name": "Vikram Sengupta",
        "email": "vikram.sengupta@cloudmetrics.ai",
        "phone": "+91 97110 99887",
        "location": "Hyderabad, IN",
        "experience_years": 1.3,
        "current_company": "SaaSMetrics Global",
        "education": "B.Com in Computer Applications, Osmania University (2024)",
        "skills": [
            "SQL",
            "Tableau",
            "Python",
            "Google BigQuery",
            "Excel Modeling",
            "SaaS Metrics",
        ],
        "projects": [
            "SaaS MRR & Net Retention Cohort Analysis: Designed recurring revenue analytics model tracking ARR, CAC payback, and churn rates in BigQuery and Tableau.",
            "User Onboarding Drop-Off Exploration: Conducted exploratory data analysis on 80k trial signups using Pandas.",
        ],
        "resume_text": """VIKRAM SENGUPTA
Email: vikram.sengupta@cloudmetrics.ai | Hyderabad, IN

EXPERIENCE
Business Intelligence Analyst | SaaSMetrics Global | July 2024 - Present
- Created BigQuery SQL views to power automated monthly recurring revenue (MRR) reports.
- Designed interactive Tableau dashboards for sales and customer success managers.
- Formulated cohort analysis models in Excel and Python to evaluate customer lifetime value (LTV).

EDUCATION
B.Com Computer Applications | Osmania University | 2021 - 2024
""",
    },
    {
        "name": "Meera Nambiar",
        "email": "meera.nambiar@finlytics.dev",
        "phone": "+91 98860 33221",
        "location": "Kochi, IN",
        "experience_years": 1.0,
        "current_company": "MarketPulse Media",
        "education": "B.Sc in Mathematics & Statistics, Kerala University (2024)",
        "skills": [
            "SQL",
            "Excel",
            "Google Data Studio",
            "Basic Python",
            "Marketing Analytics",
        ],
        "projects": [
            "Paid Ad Campaign Attribution Analysis: Extracted multi-channel ad metrics using SQL and modeled conversion attribution across Google and Meta ad spend.",
            "Customer Survey Sentiment & NPS Dashboard: Visualized quarterly Net Promoter Scores in Google Data Studio.",
        ],
        "resume_text": """MEERA NAMBIAR
Email: meera.nambiar@finlytics.dev | Kochi, IN

EXPERIENCE
Marketing Data Analyst | MarketPulse Media | October 2024 - Present (1.0 Year)
- Analyzed advertising spend efficiency across digital campaigns using SQL queries.
- Created Looker Studio (Google Data Studio) dashboards to track Cost Per Acquisition (CPA).
- Conducted basic statistical summaries in Excel and Python.

EDUCATION
B.Sc Mathematics & Statistics | Kerala University | 2021 - 2024
""",
    },
    # ── Group 2: Rejected Candidates (14 Candidates: Skill / Exp Gaps) ─────────
    {
        "name": "Rahul Nair",
        "email": "rahul.nair@frontenddev.co",
        "phone": "+91 98401 22334",
        "location": "Bangalore, IN",
        "experience_years": 1.5,
        "current_company": "WebCraft Studios",
        "education": "B.Tech in Computer Science (2024)",
        "skills": [
            "React",
            "JavaScript",
            "TypeScript",
            "Tailwind CSS",
            "HTML5",
            "Redux",
        ],
        "projects": [
            "E-Commerce Storefront: Developed responsive React shopping cart with Redux state.",
            "Portfolio CMS: Built Next.js web application with Tailwind CSS.",
        ],
        "resume_text": """RAHUL NAIR
Frontend Web Developer with 1.5 years experience in React, JavaScript, HTML/CSS, and modern frontend styling.
Experience:
Frontend Developer at WebCraft Studios (July 2024 - Present)
- Built interactive UI components in React.js and Tailwind CSS.
- Optimized Lighthouse performance scores across customer-facing websites.
Missing Skills: No SQL querying, no Python/Pandas data wrangling, no BI dashboarding.
""",
    },
    {
        "name": "Tanvi Joshi",
        "email": "tanvi.joshi@designstudio.in",
        "phone": "+91 97654 11223",
        "location": "Pune, IN",
        "experience_years": 2.0,
        "current_company": "PixelCraft UI/UX",
        "education": "B.Des in Visual Communication (2023)",
        "skills": [
            "Figma",
            "UI/UX Design",
            "Wireframing",
            "Adobe Illustrator",
            "Photoshop",
            "User Research",
        ],
        "projects": [
            "Fintech Mobile App Redesign: Crafted 60+ Figma screens and conducted 12 usability user interviews.",
            "Design System Kit: Created atomic design components for SaaS design system.",
        ],
        "resume_text": """TANVI JOSHI
Product & UI/UX Designer with 2 years experience designing web and mobile applications using Figma.
Lacks technical data analytics, SQL databases, statistical modeling, and quantitative BI reporting.
""",
    },
    {
        "name": "Karthik Raja",
        "email": "karthik.raja@qaautomation.io",
        "phone": "+91 99402 77889",
        "location": "Chennai, IN",
        "experience_years": 1.6,
        "current_company": "TestEdge Labs",
        "education": "B.E in Electronics (2024)",
        "skills": [
            "Manual Testing",
            "JIRA",
            "Test Cases",
            "Regression Testing",
            "Selenium Basics",
            "Bug Tracking",
        ],
        "projects": [
            "Web App Regression Testing Suite: Wrote and executed 300+ manual test cases in JIRA.",
            "Smoke Testing Automation: Scripted basic Selenium WebDriver smoke tests in Java.",
        ],
        "resume_text": """KARTHIK RAJA
QA Software Test Engineer with 1.6 years experience testing web applications, filing bug reports in Jira, and verifying software builds.
Missing required Data Analyst skills: SQL data modeling, exploratory data analysis, Tableau/PowerBI, and business metrics.
""",
    },
    {
        "name": "Divya Agarwal",
        "email": "divya.agarwal@freshgrad.edu",
        "phone": "+91 98112 33445",
        "location": "Delhi, IN",
        "experience_years": 0.2,
        "current_company": "Campus Graduate",
        "education": "B.Tech Computer Science, Delhi Technological University (Class of 2025)",
        "skills": [
            "Python",
            "SQL Basics",
            "Machine Learning Basics",
            "C++",
            "Data Structures",
        ],
        "projects": [
            "House Price Prediction (Kaggle): Implemented linear regression in Jupyter notebook using sklearn.",
            "College Library Management: Python Tkinter desktop app.",
        ],
        "resume_text": """DIVYA AGARWAL
Recent 2025 college graduate. Completed a 2-month summer internship at a local startup.
Does not meet the mandatory 1-year full-time professional experience requirement for the Data Analyst role.
""",
    },
    {
        "name": "Amitabh Sen",
        "email": "amitabh.sen@digitalgrow.biz",
        "phone": "+91 98310 99001",
        "location": "Kolkata, IN",
        "experience_years": 1.8,
        "current_company": "GrowthX Digital Agency",
        "education": "BBA in Marketing (2023)",
        "skills": [
            "Digital Marketing",
            "SEO",
            "Google Ads",
            "Meta Ads Manager",
            "Content Marketing",
            "Canva",
        ],
        "projects": [
            "PPC Campaign Execution: Managed $5,000 monthly ad spend on Facebook and Google Ads.",
            "SEO Keyword Optimization: Increased organic web blog traffic by 25%.",
        ],
        "resume_text": """AMITABH SEN
Digital Marketing Specialist with 1.8 years experience running social media ad campaigns and managing content SEO.
Commercial digital marketing profile without SQL querying, data warehouse schemas, Python scripting, or BI dashboarding.
""",
    },
    {
        "name": "Siddharth Verma",
        "email": "siddharth.verma@salesforce-lead.com",
        "phone": "+91 98234 55667",
        "location": "Gurgaon, IN",
        "experience_years": 1.5,
        "current_company": "Enterprise Cloud Sales",
        "education": "B.Com, Delhi University (2024)",
        "skills": [
            "B2B Sales",
            "Cold Calling",
            "Lead Generation",
            "CRM",
            "Salesforce",
            "Client Relationship",
        ],
        "projects": [
            "Outbound Lead Generation: Closed 22 SMB client accounts generating $80k annual contract value.",
            "Sales Pipeline Tracking: Updated daily pipeline stages in Salesforce CRM.",
        ],
        "resume_text": """SIDDHARTH VERMA
Sales Development Representative with 1.5 years experience in outbound prospecting and deal closing.
Lacks technical and analytical data skills (no SQL, no Python, no BI data modeling).
""",
    },
    {
        "name": "Neha Pandey",
        "email": "neha.pandey@autocadmech.org",
        "phone": "+91 97420 88990",
        "location": "Bangalore, IN",
        "experience_years": 1.3,
        "current_company": "Precision Heavy Engineering",
        "education": "B.Tech in Mechanical Engineering, NIT Surat (2024)",
        "skills": [
            "AutoCAD",
            "SolidWorks",
            "ANSYS",
            "Finite Element Analysis",
            "GD&T",
            "Manufacturing",
        ],
        "projects": [
            "Automotive Chassis Structural Optimization: Performed stress and thermal simulation in ANSYS.",
            "3D CAD Component Design: Modeled sheet metal enclosures in SolidWorks.",
        ],
        "resume_text": """NEHA PANDEY
Mechanical Design Engineer with 1.3 years experience in CAD modeling, SolidWorks, and mechanical thermal simulations.
Zero overlap with software data analytics, relational databases, or business intelligence.
""",
    },
    {
        "name": "Karan Malhotra",
        "email": "karan.malhotra@devopscloud.net",
        "phone": "+91 98190 44556",
        "location": "Mumbai, IN",
        "experience_years": 1.5,
        "current_company": "CloudNine Infra",
        "education": "B.Sc Information Technology (2024)",
        "skills": [
            "Linux",
            "Bash",
            "Docker",
            "AWS EC2",
            "Terraform",
            "CI/CD",
            "GitLab",
        ],
        "projects": [
            "Containerized App Deployment: Dockerized 6 microservices on AWS EC2 instances.",
            "CI/CD Pipeline Setup: Automated deployment pipelines with GitLab CI.",
        ],
        "resume_text": """KARAN MALHOTRA
Cloud & DevOps Administrator with 1.5 years experience in Linux system administration, Docker containers, and AWS infra.
Infrastructure engineering background lacking business analytics, SQL data modeling, and reporting dashboard tools.
""",
    },
    {
        "name": "Pooja Hegde",
        "email": "pooja.hegde@bootcampdata.dev",
        "phone": "+91 99801 66778",
        "location": "Bangalore, IN",
        "experience_years": 0.0,
        "current_company": "None (Career Transition)",
        "education": "B.A. English Literature (2023), 12-Week Online Data Bootcamp (2025)",
        "skills": ["SQL Basics", "Excel Basics", "Python Syntax", "Tableau Public"],
        "projects": [
            "Bootcamp Capstone - Superstore Sales: Created sample Tableau Public dashboard from Superstore CSV file.",
            "Titanic Passenger Analysis: Basic Jupyter notebook summary.",
        ],
        "resume_text": """POOJA HEGDE
Aspiring Data Analyst transitioning careers after completing an online 12-week data analytics bootcamp.
Has 0 years of professional work experience; does not satisfy the 1-year professional experience requirement.
""",
    },
    {
        "name": "Rishi Saxena",
        "email": "rishi.saxena@tallyaccounts.com",
        "phone": "+91 98211 77889",
        "location": "Noida, IN",
        "experience_years": 2.5,
        "current_company": "Gupta & Associates CA Firm",
        "education": "B.Com in Accounting & Finance (2023)",
        "skills": [
            "Tally ERP 9",
            "GST Filing",
            "Bookkeeping",
            "Accounts Payable",
            "Bank Reconciliation",
            "Excel",
        ],
        "projects": [
            "Corporate GST & Tax Filings: Prepared annual ledger audits for 15 manufacturing clients.",
            "Cash Flow Bookkeeping: Reconciled monthly accounts payable and receivable ledgers.",
        ],
        "resume_text": """RISHI SAXENA
Senior Accountant with 2.5 years experience in bookkeeping, Tally ERP, bank reconciliation, and tax filings.
Traditional accounting profile lacking technical SQL databases, Python data processing, and BI dashboarding.
""",
    },
    {
        "name": "Shweta Tiwari",
        "email": "shweta.tiwari@contentwrite.co",
        "phone": "+91 97180 33445",
        "location": "Delhi, IN",
        "experience_years": 1.2,
        "current_company": "ContentHub Media",
        "education": "B.A. in Journalism & Mass Communication (2024)",
        "skills": [
            "Content Writing",
            "Copywriting",
            "Blog Writing",
            "Proofreading",
            "WordPress",
            "SEO Content",
        ],
        "projects": [
            "Tech Blog Series: Published 40+ educational blog articles on technology trends.",
            "Email Newsletter Copy: Wrote weekly marketing newsletters for 50k subscribers.",
        ],
        "resume_text": """SHWETA TIWARI
Content Writer and Copywriter with 1.2 years experience writing articles, website copy, and blog posts.
Qualitative writing domain with zero technical quantitative data, SQL, or programming experience.
""",
    },
    {
        "name": "Aditya Chauhan",
        "email": "aditya.chauhan@customersupport.in",
        "phone": "+91 99100 88776",
        "location": "Jaipur, IN",
        "experience_years": 1.4,
        "current_company": "TeleSupport BPO Solutions",
        "education": "B.A. General (2024)",
        "skills": [
            "Customer Support",
            "Zendesk",
            "Freshdesk",
            "Ticket Resolution",
            "Voice Support",
            "Client Escalation",
        ],
        "projects": [
            "Tier 1 Helpdesk Support: Resolved 60+ customer inbound tickets per day with 94% CSAT rating.",
            "Support Knowledgebase FAQ: Documented troubleshooting steps for common user login issues.",
        ],
        "resume_text": """ADITYA CHAUHAN
Customer Service Representative with 1.4 years experience handling customer tickets in Zendesk.
Operational customer support profile without technical data analysis, SQL querying, or BI dashboarding capabilities.
""",
    },
    {
        "name": "Manish Rao",
        "email": "manish.rao@hrrecruiter.biz",
        "phone": "+91 98415 66778",
        "location": "Hyderabad, IN",
        "experience_years": 1.8,
        "current_company": "TalentBridge Staffing",
        "education": "MBA in Human Resources (2024)",
        "skills": [
            "HR Sourcing",
            "LinkedIn Recruiter",
            "Candidate Screening",
            "Interview Scheduling",
            "ATS Management",
        ],
        "projects": [
            "Tech Talent Sourcing: Sourced 35 software developers for IT staffing clients.",
            "Campus Hiring Drive: Coordinated logistics for university recruiting drives.",
        ],
        "resume_text": """MANISH RAO
Technical HR Recruiter with 1.8 years experience sourcing resumes, scheduling interviews, and managing ATS pipelines.
Human Resources background; does not have technical data analytics or data modeling capabilities.
""",
    },
    {
        "name": "Deepak Gupta",
        "email": "deepak.gupta@collegestudent.edu",
        "phone": "+91 98991 22334",
        "location": "Chandigarh, IN",
        "experience_years": 0.3,
        "current_company": "University Final Year Project",
        "education": "B.Tech CSE, Thapar University (Class of 2026)",
        "skills": ["C++", "Java", "HTML", "Basic SQL", "Data Structures"],
        "projects": [
            "Online Bookstore Database: MySQL college database project with 4 tables.",
            "Weather Forecast Android App: Java Android app fetching weather API data.",
        ],
        "resume_text": """DEEPAK GUPTA
Final-year engineering student graduating in 2026. Completed a 3-month college summer project.
Has 0 years of full-time professional experience; does not satisfy the 1-year minimum experience requirement.
""",
    },
]


async def seed_data_analyst_mock():
    print("🚀 Starting Data Analyst - Mock seeding...")
    async with AsyncSessionLocal() as db:
        # 1. Get default Organization
        stmt_org = select(Organization).limit(1)
        res_org = await db.execute(stmt_org)
        org = res_org.scalars().first()
        if not org:
            org = Organization(name="TalentBench Demo Org")
            db.add(org)
            await db.commit()
            await db.refresh(org)

        # 2. Check if "Data Analyst - Mock" or "Data Scientist" exists
        stmt_role = select(Role).where(
            Role.title.in_(["Data Analyst - Mock", "Data Scientist"])
        )
        res_role = await db.execute(stmt_role)
        existing_role = res_role.scalars().first()

        role_desc = (
            "We are seeking an enthusiastic Data Analyst with 1+ year of professional experience "
            "to transform raw business data into actionable dashboards and strategic insights.\n\n"
            "Key Responsibilities:\n"
            "- Write complex SQL queries (CTEs, window functions, aggregations) to extract insights from relational databases.\n"
            "- Build interactive dashboards in Power BI / Tableau for executive leadership and product teams.\n"
            "- Perform exploratory data analysis (EDA) and data wrangling using Python (pandas, numpy).\n"
            "- Analyze user funnels, retention cohorts, and A/B test results.\n\n"
            "Mandatory Requirements:\n"
            "- Minimum 1 year of professional experience in data analysis (internships alone do not qualify).\n"
            "- Strong proficiency in SQL, Excel, and at least one BI tool (Tableau/Power BI)."
        )

        if existing_role:
            role_id = existing_role.id
            existing_role.title = "Data Analyst - Mock"
            existing_role.department = "Analytics"
            existing_role.location = "Bangalore, IN"
            existing_role.employment_type = "Full-time"
            existing_role.description = role_desc
            existing_role.status = "active"
            existing_role.applicant_count = len(MOCK_CANDIDATES)
            print(f"Updated existing role {role_id} to 'Data Analyst - Mock'")
        else:
            role_id = str(uuid.uuid4())
            new_role = Role(
                id=role_id,
                org_id=org.id,
                title="Data Analyst - Mock",
                department="Analytics",
                location="Bangalore, IN",
                employment_type="Full-time",
                description=role_desc,
                status="active",
                applicant_count=len(MOCK_CANDIDATES),
            )
            db.add(new_role)
            await db.commit()
            print(f"Created new role 'Data Analyst - Mock' ({role_id})")

        # 3. Clean up old rounds and candidates for this role
        await db.execute(delete(Candidate).where(Candidate.role_id == role_id))
        await db.execute(delete(Round).where(Round.role_id == role_id))
        await db.execute(
            delete(BenchmarkProfile).where(BenchmarkProfile.role_id == role_id)
        )
        await db.commit()

        # 4. Create EXACTLY 1 Round: "Resume Screen"
        round_id = str(uuid.uuid4())
        single_round = Round(
            id=round_id,
            role_id=role_id,
            name="Resume Screen",
            type="resume_screen",
            order=0,
            input_source="excel_upload",
            ai_scored=True,
            cutoff_type="count",
            cutoff_count=5,
            cutoff_threshold=75,
            mail_template=(
                "Hi {{name}},\n\n"
                "Thank you for applying for the Data Analyst role at {{company_name}}. "
                "Your application is currently under review by our AI recruitment team."
            ),
        )
        db.add(single_round)
        await db.commit()
        print(f"Created single round 'Resume Screen' ({round_id}) with cutoff_count=5")

        # 5. Insert the 20 realistic candidate resumes
        for idx, c in enumerate(MOCK_CANDIDATES):
            cand_id = c["email"].lower().strip()
            new_cand = Candidate(
                id=cand_id,
                role_id=role_id,
                name=c["name"],
                email=c["email"],
                phone=c["phone"],
                location=c["location"],
                current_company=c["current_company"],
                experience_years=c["experience_years"],
                education=c["education"],
                skills=c["skills"],
                projects=c["projects"],
                resume_text=c["resume_text"],
                status="applied",
                overall_score=0,
                ai_match_score=0,
                current_round=0,
                created_at=datetime.now(timezone.utc),
            )
            db.add(new_cand)

        await db.commit()
        print(
            f"Successfully inserted {len(MOCK_CANDIDATES)} realistic candidate resumes for 'Data Analyst - Mock'!"
        )
        print(f"Role ID: {role_id}")
        print(f"Round ID: {round_id}")


if __name__ == "__main__":
    asyncio.run(seed_data_analyst_mock())
