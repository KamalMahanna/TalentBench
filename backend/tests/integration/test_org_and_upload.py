import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_org_and_members_api(client: AsyncClient, auth_headers: dict):
    # 1. Get Org
    org_res = await client.get("/api/v1/org", headers=auth_headers)
    assert org_res.status_code == 200
    org_data = org_res.json()["data"]
    assert "name" in org_data
    assert "plan" in org_data

    # 2. Update Org
    update_res = await client.put(
        "/api/v1/org",
        json={"name": "TalentBench Global Ltd.", "plan": "enterprise"},
        headers=auth_headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["data"]["name"] == "TalentBench Global Ltd."
    assert update_res.json()["data"]["plan"] == "enterprise"

    # 3. Get Members
    members_res = await client.get("/api/v1/org/members", headers=auth_headers)
    assert members_res.status_code == 200
    members = members_res.json()["data"]
    assert len(members) > 0

    # 4. Invite Member
    invite_res = await client.post(
        "/api/v1/org/members",
        json={"email": "new.recruiter@talentbench.io", "role": "recruiter"},
        headers=auth_headers,
    )
    assert invite_res.status_code == 200
    invited = invite_res.json()["data"]
    assert invited["email"] == "new.recruiter@talentbench.io"

    # 5. Delete Member
    delete_res = await client.delete(
        f"/api/v1/org/members/{invited['id']}", headers=auth_headers
    )
    assert delete_res.status_code == 200
    assert delete_res.json()["data"]["id"] == invited["id"]
