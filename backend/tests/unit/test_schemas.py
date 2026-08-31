import pytest
from app.schemas import (
    ApiResponse,
    Candidate,
    DashboardStats,
    Organization,
    OrgMember,
    PaginatedResponse,
    PerformanceReport,
    Role,
    Round,
    RoundResult,
)


def test_api_response_schema():
    res = ApiResponse(data={"key": "value"}, message="Success")
    assert res.data["key"] == "value"
    assert res.message == "Success"
    assert res.error is None


def test_paginated_response_schema():
    res = PaginatedResponse(
        data=[{"id": "1"}, {"id": "2"}],
        total=10,
        page=1,
        page_size=2,
        has_more=True,
    )
    assert res.total == 10
    assert len(res.data) == 2
    assert res.has_more is True


def test_role_and_round_schemas():
    round_obj = Round(
        id="round-1",
        role_id="role-1",
        name="Resume Screen",
        type="resume_screen",
        order=0,
        input_source="excel_upload",
        ai_scored=True,
        cutoff_threshold=60,
        mail_template="Hi {{name}}",
        created_at="2026-08-31T00:00:00Z",
    )
    role_obj = Role(
        id="role-1",
        org_id="org-1",
        title="Staff Engineer",
        department="Engineering",
        location="Remote",
        employment_type="Full-time",
        description="Lead engineering",
        status="active",
        created_at="2026-08-31T00:00:00Z",
        applicant_count=150,
        rounds=[round_obj],
    )
    assert role_obj.id == "role-1"
    assert len(role_obj.rounds) == 1
    assert role_obj.rounds[0].type == "resume_screen"


def test_candidate_schema():
    cand = Candidate(
        id="c-1",
        role_id="r-1",
        name="Jane Doe",
        email="jane@example.com",
        phone="+1234567890",
        avatar_url="https://avatar.url",
        resume_url="https://s3.url",
        status="screened",
        current_round=1,
        overall_score=85,
        applied_at="2026-08-31T00:00:00Z",
        experience_years=5,
        current_company="Acme",
        skills=["Python", "FastAPI"],
        projects=["API Gateway"],
        education="B.S. CS",
        location="SF",
        ai_match_score=88,
        round_results=[],
    )
    assert cand.name == "Jane Doe"
    assert cand.status == "screened"
    assert "Python" in cand.skills
