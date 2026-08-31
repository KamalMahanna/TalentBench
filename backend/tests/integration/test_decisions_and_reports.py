import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_override_decision_and_audit_report(
    client: AsyncClient, auth_headers: dict
):
    # 1. Create role and candidate
    role_res = await client.post(
        "/api/v1/roles",
        json={"title": "DevOps Engineer", "department": "Infrastructure"},
        headers=auth_headers,
    )
    role_id = role_res.json()["data"]["id"]

    upload_res = await client.post(
        f"/api/v1/roles/{role_id}/upload",
        json={"files": [{"name": "devops_resume.pdf", "size": 2048}]},
        headers=auth_headers,
    )
    cands_res = await client.get(
        f"/api/v1/roles/{role_id}/candidates", headers=auth_headers
    )
    candidate_id = cands_res.json()["data"][0]["id"]

    # 2. Override decision
    override_res = await client.post(
        f"/api/v1/candidates/{candidate_id}/override",
        json={
            "newStatus": "passed",
            "reason": "Exceptional Terraform and Kubernetes contributions",
        },
        headers=auth_headers,
    )
    assert override_res.status_code == 200
    override_data = override_res.json()["data"]
    assert override_data["overridden"] is True
    assert (
        override_data["override_reason"]
        == "Exceptional Terraform and Kubernetes contributions"
    )

    # 3. Check audit log
    audit_res = await client.get(
        f"/api/v1/candidates/{candidate_id}/audit-log", headers=auth_headers
    )
    assert audit_res.status_code == 200
    audit_data = audit_res.json()["data"]
    assert len(audit_data) > 0
    assert any(a["action"] == "Decision overridden" for a in audit_data)

    # 4. Check performance report
    report_res = await client.get(
        f"/api/v1/candidates/{candidate_id}/performance-report", headers=auth_headers
    )
    assert report_res.status_code == 200
    report_data = report_res.json()["data"]
    assert report_data["candidate_id"] == candidate_id
    assert len(report_data["radar_scores"]) >= 6
    assert len(report_data["strengths"]) > 0
