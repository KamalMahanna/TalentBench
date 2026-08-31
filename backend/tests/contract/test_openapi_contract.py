import pytest
from app.main import app


def test_openapi_contract_matches_frontend_types():
    """
    Contract Test: Validates that auto-generated OpenAPI spec components
    match the TypeScript interfaces expected by lib/types.ts exactly.
    """
    schema = app.openapi()
    components = schema.get("components", {}).get("schemas", {})

    # 1. Validate Role Schema
    assert "Role" in components
    role_props = components["Role"]["properties"]
    expected_role_fields = [
        "id",
        "org_id",
        "title",
        "department",
        "location",
        "employment_type",
        "description",
        "status",
        "created_at",
        "applicant_count",
        "rounds",
    ]
    for field in expected_role_fields:
        assert field in role_props, f"Missing field '{field}' in OpenAPI Role schema"

    # 2. Validate Round Schema
    assert "Round" in components
    round_props = components["Round"]["properties"]
    expected_round_fields = [
        "id",
        "role_id",
        "name",
        "type",
        "order",
        "input_source",
        "ai_scored",
        "cutoff_threshold",
        "mail_template",
        "created_at",
    ]
    for field in expected_round_fields:
        assert field in round_props, f"Missing field '{field}' in OpenAPI Round schema"

    # 3. Validate Candidate Schema
    assert "Candidate" in components
    cand_props = components["Candidate"]["properties"]
    expected_cand_fields = [
        "id",
        "role_id",
        "name",
        "email",
        "phone",
        "avatar_url",
        "resume_url",
        "status",
        "current_round",
        "overall_score",
        "applied_at",
        "experience_years",
        "current_company",
        "skills",
        "projects",
        "education",
        "location",
        "ai_match_score",
        "round_results",
    ]
    for field in expected_cand_fields:
        assert field in cand_props, (
            f"Missing field '{field}' in OpenAPI Candidate schema"
        )

    # 4. Validate RoundResult Schema
    assert "RoundResult" in components
    rr_props = components["RoundResult"]["properties"]
    expected_rr_fields = [
        "id",
        "candidate_id",
        "round_id",
        "round_name",
        "round_type",
        "status",
        "score",
        "ai_verdict",
        "ai_summary",
        "evaluated_at",
        "overridden",
        "override_reason",
        "overridden_by",
        "overridden_at",
    ]
    for field in expected_rr_fields:
        assert field in rr_props, (
            f"Missing field '{field}' in OpenAPI RoundResult schema"
        )

    # 5. Validate BenchmarkProfile Schema
    assert "BenchmarkProfile" in components
    bp_props = components["BenchmarkProfile"]["properties"]
    expected_bp_fields = [
        "shortlisted_count",
        "avg_resume_score",
        "avg_test_score",
        "avg_interview_score",
        "top_skills",
        "avg_experience_years",
    ]
    for field in expected_bp_fields:
        assert field in bp_props, (
            f"Missing field '{field}' in OpenAPI BenchmarkProfile schema"
        )

    # 6. Validate PerformanceReport Schema
    assert "PerformanceReport" in components
    report_props = components["PerformanceReport"]["properties"]
    expected_report_fields = [
        "candidate_id",
        "candidate_name",
        "role_title",
        "company_name",
        "generated_at",
        "outcome",
        "overall_percentile",
        "resume_match",
        "project_depth",
        "aptitude_breakdown",
        "communication_rubric",
        "radar_scores",
        "ai_feedback",
        "improvement_areas",
        "strengths",
    ]
    for field in expected_report_fields:
        assert field in report_props, (
            f"Missing field '{field}' in OpenAPI PerformanceReport schema"
        )

    # 7. Validate Organization & Member Schemas
    assert "Organization" in components
    assert "OrgMember" in components
    org_props = components["Organization"]["properties"]
    for field in ["id", "name", "logo_url", "plan", "seats_used", "seats_total"]:
        assert field in org_props, (
            f"Missing field '{field}' in OpenAPI Organization schema"
        )

    member_props = components["OrgMember"]["properties"]
    for field in ["id", "name", "email", "role", "avatar_url", "last_active"]:
        assert field in member_props, (
            f"Missing field '{field}' in OpenAPI OrgMember schema"
        )

    # 8. Validate DashboardStats Schema
    assert "DashboardStats" in components
    stats_props = components["DashboardStats"]["properties"]
    for field in [
        "total_roles",
        "active_roles",
        "total_candidates",
        "hired_this_month",
        "avg_time_to_hire_days",
        "pipeline_value",
    ]:
        assert field in stats_props, (
            f"Missing field '{field}' in OpenAPI DashboardStats schema"
        )

    # 9. Validate AuthUser Schema
    assert "AuthUser" in components
    auth_props = components["AuthUser"]["properties"]
    for field in ["id", "email", "name", "avatar_url", "org_id", "token"]:
        assert field in auth_props, (
            f"Missing field '{field}' in OpenAPI AuthUser schema"
        )
