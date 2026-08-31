import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_candidates_upload_and_queries(client: AsyncClient, auth_headers: dict):
    # 1. Create a role
    role_res = await client.post(
        "/api/v1/roles",
        json={"title": "ML Engineer", "department": "AI", "status": "active"},
        headers=auth_headers,
    )
    role_id = role_res.json()["data"]["id"]

    # 2. Bulk upload candidate files (simulated/json)
    upload_res = await client.post(
        f"/api/v1/roles/{role_id}/upload",
        json={
            "files": [
                {"name": "resume1.pdf", "size": 1024},
                {"name": "resume2.pdf", "size": 2048},
            ]
        },
        headers=auth_headers,
    )
    assert upload_res.status_code == 200
    assert upload_res.json()["data"]["uploaded"] == 2

    # 3. Query candidates list with pagination
    cand_res = await client.get(
        f"/api/v1/roles/{role_id}/candidates?page=1&page_size=10", headers=auth_headers
    )
    assert cand_res.status_code == 200
    paginated = cand_res.json()
    assert paginated["total"] >= 2
    assert len(paginated["data"]) >= 2

    first_cand = paginated["data"][0]
    cand_id = first_cand["id"]

    # 4. Query candidate detail
    detail_res = await client.get(f"/api/v1/candidates/{cand_id}", headers=auth_headers)
    assert detail_res.status_code == 200
    cand_detail = detail_res.json()["data"]
    assert cand_detail["id"] == cand_id
    assert cand_detail["role_id"] == role_id
