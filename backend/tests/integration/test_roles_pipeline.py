import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_roles_and_rounds_crud(client: AsyncClient, auth_headers: dict):
    # Create Role
    create_res = await client.post(
        "/api/v1/roles",
        json={
            "title": "Senior Distributed Systems Engineer",
            "department": "Infrastructure",
            "location": "San Francisco, US",
            "employment_type": "Full-time",
            "description": "Design and operate distributed databases and low-latency message buses.",
            "status": "active",
        },
        headers=auth_headers,
    )
    assert create_res.status_code == 200
    role_data = create_res.json()["data"]
    role_id = role_data["id"]
    assert role_data["title"] == "Senior Distributed Systems Engineer"
    assert len(role_data["rounds"]) >= 4

    # Get Roles list
    list_res = await client.get("/api/v1/roles", headers=auth_headers)
    assert list_res.status_code == 200
    roles = list_res.json()["data"]
    assert any(r["id"] == role_id for r in roles)

    # Get Single Role
    get_res = await client.get(f"/api/v1/roles/{role_id}", headers=auth_headers)
    assert get_res.status_code == 200
    assert get_res.json()["data"]["id"] == role_id

    # Update Rounds
    rounds_payload = [
        {
            "name": "Custom Resume Screen",
            "type": "resume_screen",
            "order": 0,
            "input_source": "excel_upload",
            "ai_scored": True,
            "cutoff_threshold": 65,
            "mail_template": "Hi {{name}}",
        },
        {
            "name": "System Design & Concurrency",
            "type": "interview",
            "order": 1,
            "input_source": "manual_entry",
            "ai_scored": True,
            "cutoff_threshold": 75,
            "mail_template": "Hi {{name}}, invitation",
        },
    ]
    rounds_res = await client.put(
        f"/api/v1/roles/{role_id}/rounds", json=rounds_payload, headers=auth_headers
    )
    assert rounds_res.status_code == 200
    rounds_data = rounds_res.json()["data"]
    assert len(rounds_data) == 2
    assert rounds_data[0]["name"] == "Custom Resume Screen"
