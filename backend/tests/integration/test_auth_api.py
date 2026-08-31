import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_auth_signup_and_login(client: AsyncClient):
    # Signup
    signup_res = await client.post(
        "/api/v1/auth/signup",
        json={
            "email": "recruiter@talentbench.io",
            "name": "Alex Morgan",
            "orgName": "TalentBench Demo Co.",
        },
    )
    assert signup_res.status_code == 200
    data = signup_res.json()["data"]
    assert data["email"] == "recruiter@talentbench.io"
    assert "token" in data

    # Login
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "recruiter@talentbench.io", "password": "demo1234"},
    )
    assert login_res.status_code == 200
    login_data = login_res.json()["data"]
    assert login_data["email"] == "recruiter@talentbench.io"
    assert "token" in login_data
