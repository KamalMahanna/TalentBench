import pytest
from app.parsing.embeddings import compute_jd_match_score, cosine_similarity
from app.parsing.excel_parser import parse_round_results_excel
from app.parsing.skill_extractor import extract_candidate_metadata


def test_extract_candidate_metadata():
    text = """
    Alex Johnson
    Email: alex.johnson@techcorp.com
    Phone: (555) 123-4567

    Experienced Backend Developer with strong skills in Python, FastAPI, PostgreSQL, and Docker.
    Built microservices with Kafka and deployed on Kubernetes.
    """
    res = extract_candidate_metadata(text)
    assert res["email"] == "alex.johnson@techcorp.com"
    assert "Python" in res["skills"]
    assert "FastAPI" in res["skills"]
    assert "PostgreSQL" in res["skills"]
    assert "Docker" in res["skills"]


def test_cosine_similarity():
    v1 = [1.0, 0.0, 0.0]
    v2 = [1.0, 0.0, 0.0]
    assert pytest.approx(cosine_similarity(v1, v2), 0.001) == 1.0

    v3 = [0.0, 1.0, 0.0]
    assert pytest.approx(cosine_similarity(v1, v3), 0.001) == 0.0


def test_compute_jd_match_score():
    score = compute_jd_match_score(
        resume_embedding=[1.0, 0.5, 0.2],
        jd_embedding=[1.0, 0.5, 0.2],
        candidate_skills=["Python", "FastAPI", "PostgreSQL"],
        required_skills=["Python", "FastAPI", "PostgreSQL"],
    )
    assert score >= 90


def test_parse_round_results_excel():
    csv_data = b"Candidate Email,Score,Status,Feedback\njohn@example.com,85,Passed,Great technical answers\nmary@example.com,45,Failed,Needs more DSA practice\n"
    res = parse_round_results_excel(csv_data)
    assert len(res) == 2
    assert res[0]["email"] == "john@example.com"
    assert res[0]["score"] == 85
    assert res[0]["status"] == "passed"
    assert res[1]["email"] == "mary@example.com"
    assert res[1]["score"] == 45
    assert res[1]["status"] == "failed"
