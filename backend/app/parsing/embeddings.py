import numpy as np


def cosine_similarity(
    v1: list[float] | np.ndarray, v2: list[float] | np.ndarray
) -> float:
    """Calculate cosine similarity between two embedding vectors."""
    a = np.array(v1)
    b = np.array(v2)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


def compute_jd_match_score(
    resume_embedding: list[float] | None,
    jd_embedding: list[float] | None,
    candidate_skills: list[str],
    required_skills: list[str],
) -> int:
    """Compute overall JD match score combining semantic vector similarity and skill overlap."""
    semantic_score = 70.0
    if resume_embedding is not None and jd_embedding is not None:
        sim = cosine_similarity(resume_embedding, jd_embedding)
        # Scale similarity (-1 to 1) into (0 to 100)
        semantic_score = max(0.0, min(100.0, ((sim + 1.0) / 2.0) * 100.0))

    # Skill overlap score
    skill_score = 70.0
    if required_skills:
        req_set = set(s.lower() for s in required_skills)
        cand_set = set(s.lower() for s in candidate_skills)
        matched = len(req_set.intersection(cand_set))
        skill_score = (matched / max(1, len(req_set))) * 100.0

    # 60% semantic + 40% keyword skill overlap
    final_score = (0.6 * semantic_score) + (0.4 * skill_score)
    return int(round(max(0, min(100, final_score))))
