import asyncio
import hashlib
import json
import random
from typing import Any, AsyncIterator
import numpy as np
from app.llm.gateway import EvalResponse, LLMGateway, LLMResponse, ScreenResult


class MockLLMProvider(LLMGateway):
    """Deterministic, high-fidelity mock LLM provider for dev, testing, and offline scale testing."""

    def __init__(self, seed: int = 42):
        self._seed = seed

    def _hash_seed(self, text: str) -> int:
        h = hashlib.sha256(text.encode("utf-8")).hexdigest()
        return int(h[:8], 16)

    async def complete(
        self,
        prompt: str,
        system_prompt: str = "You are an expert AI recruiter evaluating candidate assessments.",
        temperature: float = 0.2,
        max_tokens: int = 2048,
        json_mode: bool = False,
    ) -> LLMResponse:
        if json_mode:
            sample_json = {
                "decision": "advance",
                "feedback": "Candidate showed exceptional engineering depth and robust architecture thinking.",
                "score": 88,
            }
            return LLMResponse(
                text=json.dumps(sample_json),
                prompt_tokens=len(prompt.split()),
                completion_tokens=len(str(sample_json).split()),
                total_tokens=len(prompt.split()) + len(str(sample_json).split()),
                model="mock-gpt-4o",
            )

        # Personalized gap summary response
        if "gap" in prompt.lower() or "rejection" in prompt.lower():
            text = (
                "While your background in software engineering is strong, we identified a small gap in "
                "distributed system latency profiling and advanced concurrency patterns required for this senior position. "
                "We strongly encourage deepening practical hands-on experience with high-throughput streaming systems."
            )
        elif "invitation" in prompt.lower() or "next round" in prompt.lower():
            text = (
                "Your experience in backend architectures and API design strongly aligned with our team benchmarks. "
                "We are thrilled to invite you to the upcoming assessment round."
            )
        else:
            text = f"Evaluated candidate response with high relevance. Key takeaways match rubric criteria."

        return LLMResponse(
            text=text,
            prompt_tokens=len(prompt.split()),
            completion_tokens=len(text.split()),
            total_tokens=len(prompt.split()) + len(text.split()),
            model="mock-gpt-4o",
        )

    async def evaluate(
        self,
        round_type: str,
        rubric: str,
        candidate_data: dict[str, Any],
        benchmark_data: dict[str, Any] | None = None,
        role_data: dict[str, Any] | None = None,
    ) -> EvalResponse:
        cand_name = candidate_data.get("name", "Candidate")
        skills = candidate_data.get("skills", ["Python", "FastAPI", "PostgreSQL"])
        years = candidate_data.get("experience_years", 4)

        # Deterministic scoring based on candidate properties
        seed = self._hash_seed(f"{cand_name}-{round_type}-{skills}")
        rng = random.Random(seed)

        base_score = 65 + (min(years, 10) * 2) + rng.randint(-10, 15)
        score = max(35, min(96, base_score))
        passed = score >= 60

        if passed:
            verdict = (
                f"Candidate demonstrates strong {round_type.replace('_', ' ')} alignment "
                f"with a score of {score}/100. Key strengths noted in {skills[0] if skills else 'system design'} "
                f"and clear problem decomposition."
            )
            summary = (
                f"{cand_name} effectively demonstrated core competencies matching the benchmark profile. "
                f"Architecture decisions and execution clarity were above the target threshold."
            )
        else:
            verdict = (
                f"Score of {score}/100 falls below the cutoff threshold. "
                f"Key gaps identified in practical depth and benchmark comparison."
            )
            summary = (
                f"{cand_name} showed foundational knowledge but struggled with edge-case handling "
                f"and optimal algorithmic trade-offs."
            )

        strengths = [
            f"Strong command of {skills[0] if skills else 'core technologies'}",
            "Clear technical communication and structured problem solving",
            "Practical hands-on project portfolio",
        ]

        improvement_areas = [
            "Strengthen quantitative analysis and edge-case handling in live coding",
            "Deepen exposure to production-grade distributed architectures",
            "Practice articulating trade-offs under high-throughput constraints",
        ]

        category_scores = {
            "Core Knowledge": max(40, min(95, score + rng.randint(-5, 5))),
            "Problem Solving": max(40, min(95, score + rng.randint(-8, 8))),
            "System Design": max(40, min(95, score + rng.randint(-6, 6))),
            "Communication": max(40, min(95, score + rng.randint(-4, 7))),
        }

        radar_scores = {
            "Resume Match": max(40, min(98, score + rng.randint(-5, 5))),
            "Project Depth": max(40, min(95, score + rng.randint(-8, 6))),
            "Aptitude": max(40, min(95, score + rng.randint(-6, 8))),
            "Communication": max(40, min(95, score + rng.randint(-5, 5))),
            "DSA Skills": max(40, min(95, score + rng.randint(-7, 7))),
            "Culture Fit": max(40, min(95, score + rng.randint(-4, 6))),
        }

        raw_output = json.dumps(
            {
                "score": score,
                "verdict": verdict,
                "summary": summary,
                "category_scores": category_scores,
                "radar_scores": radar_scores,
                "strengths": strengths,
                "improvement_areas": improvement_areas,
            }
        )

        return EvalResponse(
            score=score,
            verdict=verdict,
            summary=summary,
            strengths=strengths,
            improvement_areas=improvement_areas,
            category_scores=category_scores,
            radar_scores=radar_scores,
            model_name="mock-gpt-4o",
            raw_output=raw_output,
            prompt_snapshot=f"Round: {round_type} | Rubric: {rubric[:100]} | Candidate: {cand_name}",
        )

    async def embed(self, text: str) -> list[float]:
        # Generate 1536-dimensional normalized vector deterministically
        seed = self._hash_seed(text)
        rng = np.random.default_rng(seed)
        vec = rng.standard_normal(1536)
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec.tolist()

    async def stream(
        self,
        prompt: str,
        system_prompt: str = "You are an expert recruitment assistant.",
    ) -> AsyncIterator[str]:
        words = (
            "Based on the assessment, the candidate demonstrated solid technical acumen. "
            "Their practical background provides strong evidence of execution ability in high-scale environments."
        ).split(" ")
        for word in words:
            yield word + " "
            await asyncio.sleep(0.02)

    async def extract_skills_and_projects(
        self,
        resume_text: str,
    ) -> dict[str, Any]:
        pool_skills = [
            "React",
            "TypeScript",
            "Node.js",
            "Python",
            "FastAPI",
            "PostgreSQL",
            "AWS",
            "Docker",
            "Kubernetes",
            "Redis",
            "Kafka",
            "GraphQL",
            "Go",
            "Rust",
        ]
        pool_projects = [
            "Distributed Event-Driven Ingestion Engine",
            "Real-Time Collaboration Service",
            "High-Throughput API Gateway",
            "Observability & Tracing Infrastructure",
            "ML Feature Store & Pipeline",
        ]

        seed = self._hash_seed(resume_text or "default")
        rng = random.Random(seed)

        selected_skills = rng.sample(pool_skills, k=rng.randint(4, 7))
        selected_projects = rng.sample(pool_projects, k=rng.randint(2, 4))

        return {
            "name": f"Candidate {seed % 1000}",
            "email": f"applicant{seed % 1000}@example.com",
            "phone": f"+1 (555) {100 + (seed % 900):03d}-{1000 + (seed % 9000):04d}",
            "skills": selected_skills,
            "projects": selected_projects,
            "experience_years": rng.randint(2, 12),
            "current_company": rng.choice(
                ["Stripe", "Linear", "Figma", "Datadog", "Vercel", "Ramp"]
            ),
            "education": "B.S. in Computer Science, Tech University",
            "location": rng.choice(
                [
                    "San Francisco, US",
                    "Remote",
                    "London, UK",
                    "New York, US",
                    "Bangalore, IN",
                ]
            ),
            "ai_match_score": rng.randint(65, 96),
        }

    async def reduce_projects(
        self,
        projects: list[str],
        target_count: int = 3,
        role_context: str = "",
    ) -> list[str]:
        if not projects:
            return [
                "High-Scale Microservices Platform",
                "Real-Time Telemetry Pipeline",
                "Distributed Data Store",
            ]
        if len(projects) <= target_count:
            return projects

        # Select top N most relevant / impactful projects
        return projects[:target_count]

    async def screen_candidate(
        self,
        jd_text: str,
        resume_text: str,
        candidate_name: str = "Candidate",
    ) -> ScreenResult:
        lower_resume = resume_text.lower()
        lower_jd = jd_text.lower()

        # Check if resume indicates internship only or lacks required experience
        has_internship = "intern" in lower_resume
        has_fulltime = "full-time" in lower_resume or "years" in lower_resume

        # If only internships mentioned without full-time experience
        if has_internship and not has_fulltime:
            return ScreenResult(
                matched=False,
                verdict=(
                    f"Thank you for taking the time to apply for the position. After reviewing your resume, "
                    f"we noted that your background primarily reflects internship experience. "
                    f"Please note that internship experience cannot be counted toward the required professional "
                    f"full-time experience level specified in the Job Description, and we are unable to advance your application."
                ),
                reason="Internship does not count as professional full-time experience.",
                model_name="mock-gpt-4o",
            )

        # Check if skills completely mismatch (e.g. Graphic designer vs backend)
        if "graphic design" in lower_resume or "photoshop" in lower_resume:
            return ScreenResult(
                matched=False,
                verdict=(
                    f"Thank you for applying. After reviewing your qualifications against the Job Description, "
                    f"we found that your experience does not demonstrate the core technical proficiencies "
                    f"required for this engineering role."
                ),
                reason="Core skill mismatch against Job Description.",
                model_name="mock-gpt-4o",
            )

        # Otherwise, matches if some skill / experience matches
        return ScreenResult(
            matched=True,
            verdict="yes",
            reason="Candidate matched required experience and relevant skills.",
            model_name="mock-gpt-4o",
        )
