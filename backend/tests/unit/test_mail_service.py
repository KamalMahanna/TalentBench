import pytest
from app.services.mail_service import mail_service


@pytest.mark.asyncio
async def test_generate_invitation_mail():
    res = await mail_service.generate_invitation_mail(
        candidate_name="Sarah Connor",
        role_title="Lead Architect",
        round_name="DSA & Architecture",
        candidate_skills=["Python", "Distributed Systems"],
    )
    assert "Sarah Connor" in res["body"]
    assert "Lead Architect" in res["body"]
    assert "DSA & Architecture" in res["body"]
    assert len(res["personalized_section"]) > 0


@pytest.mark.asyncio
async def test_generate_gap_mail():
    res = await mail_service.generate_gap_mail(
        candidate_name="John Doe",
        role_title="Backend Engineer",
        round_name="Aptitude Test",
        candidate_score=52,
        cutoff_threshold=70,
        gap_summary="Quantitative reasoning and probability questions.",
    )
    assert "John Doe" in res["body"]
    assert "Backend Engineer" in res["body"]
    assert len(res["personalized_section"]) > 0
