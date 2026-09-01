import asyncio
import hashlib
import json
import re
from typing import Any, AsyncIterator
import numpy as np
import structlog
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq
from app.config import settings
from app.llm.gateway import EvalResponse, LLMGateway, LLMResponse, ScreenResult
from app.llm.rate_limiter import GroqRateLimiter

logger = structlog.get_logger()


class LangChainGroqProvider(LLMGateway):
    """
    Production LangChain Groq Provider implementing LLMGateway:
    - Model: qwen/qwen3.8-27b
    - Quotas: 30 RPM, 1K RPD, 8K TPM, 200K TPD
    - Proactive rate limiting, 429 auto-retry with exponential backoff & jitter
    """

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        rate_limiter: GroqRateLimiter | None = None,
    ):
        self.api_key = api_key or settings.GROQ_API_KEY or "mock-groq-key"
        self.model_name = model or settings.GROQ_MODEL or "qwen/qwen3.8-27b"
        self.rate_limiter = rate_limiter or GroqRateLimiter(
            rpm_limit=settings.GROQ_RPM_LIMIT,
            rpd_limit=settings.GROQ_RPD_LIMIT,
            tpm_limit=settings.GROQ_TPM_LIMIT,
            tpd_limit=settings.GROQ_TPD_LIMIT,
            max_retries=settings.GROQ_MAX_RETRIES,
            base_delay=settings.GROQ_RETRY_BASE_DELAY,
            max_delay=settings.GROQ_RETRY_MAX_DELAY,
        )
        self._client: ChatGroq | None = None

    def _get_client(self, temperature: float = 0.2, max_tokens: int = 2048) -> ChatGroq:
        return ChatGroq(
            groq_api_key=self.api_key,
            model_name=self.model_name,
            temperature=temperature,
            max_tokens=max_tokens,
            max_retries=0,  # We handle retries through our advanced rate limiter & backoff
        )

    def _hash_seed(self, text: str) -> int:
        h = hashlib.sha256(text.encode("utf-8")).hexdigest()
        return int(h[:8], 16)

    async def _execute_with_retry(self, func, estimated_tokens: int = 400):
        """Execute async function with proactive rate limiting, 429 catching, and backoff."""
        for attempt in range(self.rate_limiter.max_retries):
            try:
                # 1. Proactive Rate Limit Acquire
                await self.rate_limiter.acquire(estimated_tokens=estimated_tokens)

                # 2. Call Groq function
                result = await func()
                return result
            except Exception as exc:
                err_msg = str(exc).lower()
                is_rate_limit = (
                    "429" in err_msg
                    or "rate limit" in err_msg
                    or "too many requests" in err_msg
                )
                is_transient = (
                    is_rate_limit
                    or "503" in err_msg
                    or "timeout" in err_msg
                    or "connection" in err_msg
                )

                if is_transient and attempt < self.rate_limiter.max_retries - 1:
                    await self.rate_limiter.handle_backoff(attempt, exc)
                else:
                    logger.error(
                        "groq_request_failed_permanently",
                        attempt=attempt,
                        error=str(exc),
                    )
                    raise exc

    async def complete(
        self,
        prompt: str,
        system_prompt: str = "You are an expert AI recruiter evaluating candidate assessments.",
        temperature: float = 0.2,
        max_tokens: int = 2048,
        json_mode: bool = False,
    ) -> LLMResponse:
        estimated_tokens = len(prompt.split()) + len(system_prompt.split()) + 200

        async def _call():
            if not self.api_key or self.api_key == "mock-groq-key":
                text = (
                    "While your background in software engineering is solid, we identified a minor gap in "
                    "distributed concurrency trade-offs for this position."
                    if "gap" in prompt.lower()
                    else "Your practical experience in backend engineering strongly aligns with our technical bar."
                )
                return LLMResponse(
                    text=text,
                    prompt_tokens=len(prompt.split()),
                    completion_tokens=len(text.split()),
                    total_tokens=len(prompt.split()) + len(text.split()),
                    model=self.model_name,
                )

            client = self._get_client(temperature=temperature, max_tokens=max_tokens)
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=prompt),
            ]
            if json_mode:
                client = client.bind(response_format={"type": "json_object"})

            res = await client.ainvoke(messages)
            usage = getattr(res, "usage_metadata", {}) or {}
            prompt_tokens = usage.get("input_tokens", len(prompt.split()))
            completion_tokens = usage.get("output_tokens", len(res.content.split()))
            total_tokens = prompt_tokens + completion_tokens

            await self.rate_limiter.record_actual_tokens(total_tokens, estimated_tokens)

            return LLMResponse(
                text=str(res.content),
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
                model=self.model_name,
            )

        return await self._execute_with_retry(_call, estimated_tokens=estimated_tokens)

    async def evaluate(
        self,
        round_type: str,
        rubric: str,
        candidate_data: dict[str, Any],
        benchmark_data: dict[str, Any] | None = None,
        role_data: dict[str, Any] | None = None,
    ) -> EvalResponse:
        system_prompt = (
            "You are an objective AI recruitment evaluation engine. Benchmark the candidate against the rubric and return a strict JSON object with fields: "
            "score (0-100), verdict (string), summary (string), strengths (array of strings), improvement_areas (array of strings), "
            "category_scores (object mapping category to 0-100 integer), radar_scores (object mapping dimension to 0-100 integer)."
        )
        prompt = (
            f"Round Type: {round_type}\n"
            f"Rubric: {rubric}\n"
            f"Candidate Info: {json.dumps(candidate_data)}\n"
            f"Benchmark Baseline: {json.dumps(benchmark_data or {})}\n"
            f"Role Info: {json.dumps(role_data or {})}\n"
            f"Provide an in-depth score and constructive explainable feedback."
        )

        estimated_tokens = len(prompt.split()) + 400

        async def _call():
            if not self.api_key or self.api_key == "mock-groq-key":
                cand_name = candidate_data.get("name", "Candidate")
                score = min(95, max(45, 70 + (self._hash_seed(cand_name) % 25)))
                passed = score >= 60
                return EvalResponse(
                    score=score,
                    verdict=f"Candidate demonstrated {'strong' if passed else 'adequate'} competency with score {score}/100.",
                    summary=f"Evaluation against {round_type} criteria completed.",
                    strengths=[
                        "Strong technical fundamentals",
                        "Structured architecture articulation",
                    ],
                    improvement_areas=[
                        "Deepen quantitative performance profiling in high-concurrency systems"
                    ],
                    category_scores={
                        "Core Skills": score,
                        "Problem Solving": score + 2,
                        "Architecture": score - 2,
                    },
                    radar_scores={
                        "Resume Match": score,
                        "Project Depth": score + 1,
                        "Aptitude": score - 3,
                    },
                    model_name=self.model_name,
                    raw_output=json.dumps({"score": score, "passed": passed}),
                    prompt_snapshot=f"Round: {round_type} | Candidate: {cand_name}",
                )

            client = self._get_client(temperature=0.1, max_tokens=1500)
            client = client.bind(response_format={"type": "json_object"})
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=prompt),
            ]
            res = await client.ainvoke(messages)
            raw = str(res.content)

            parsed = json.loads(raw)
            score = int(parsed.get("score", 75))
            return EvalResponse(
                score=score,
                verdict=parsed.get("verdict", f"Evaluated with score {score}/100"),
                summary=parsed.get("summary", "Evaluation completed."),
                strengths=parsed.get("strengths", ["Solid foundational knowledge"]),
                improvement_areas=parsed.get(
                    "improvement_areas", ["Continue refining practical trade-offs"]
                ),
                category_scores=parsed.get("category_scores", {}),
                radar_scores=parsed.get("radar_scores", {}),
                model_name=self.model_name,
                raw_output=raw,
                prompt_snapshot=f"Round: {round_type} | Candidate: {candidate_data.get('name', 'Candidate')}",
            )

        return await self._execute_with_retry(_call, estimated_tokens=estimated_tokens)

    async def embed(self, text: str) -> list[float]:
        seed = self._hash_seed(text or "candidate")
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
        estimated_tokens = len(prompt.split()) + 300
        await self.rate_limiter.acquire(estimated_tokens=estimated_tokens)

        if not self.api_key or self.api_key == "mock-groq-key":
            sample_words = "Assessment generated via Qwen model on Groq hardware with low latency and high accuracy.".split(
                " "
            )
            for w in sample_words:
                yield w + " "
                await asyncio.sleep(0.02)
            return

        client = self._get_client(temperature=0.2, max_tokens=1000)
        messages = [SystemMessage(content=system_prompt), HumanMessage(content=prompt)]
        async for chunk in client.astream(messages):
            if chunk.content:
                yield str(chunk.content)

    async def extract_skills_and_projects(self, resume_text: str) -> dict[str, Any]:
        system_prompt = (
            "Extract structured candidate metadata from the resume. Return strict JSON with fields: "
            "name (string), email (string), phone (string), skills (array of strings), projects (array of strings), "
            "experience_years (integer), current_company (string), education (string), location (string), ai_match_score (0-100 integer)."
        )
        prompt = f"Resume content:\n{resume_text[:4000]}"
        estimated_tokens = len(prompt.split()) + 300

        async def _call():
            if not self.api_key or self.api_key == "mock-groq-key":
                seed = self._hash_seed(resume_text or "default")
                return {
                    "name": f"Candidate {seed % 1000}",
                    "email": f"applicant{seed % 1000}@example.com",
                    "phone": f"+1 (555) {100 + (seed % 900):03d}-{1000 + (seed % 9000):04d}",
                    "skills": [
                        "Python",
                        "FastAPI",
                        "PostgreSQL",
                        "Docker",
                        "AWS",
                        "Redis",
                    ],
                    "projects": [
                        "Distributed Cache Engine",
                        "Real-Time Collaboration Service",
                    ],
                    "experience_years": 4,
                    "current_company": "Tech Corp",
                    "education": "B.S. in Computer Science",
                    "location": "Remote",
                    "ai_match_score": 82,
                }

            client = self._get_client(temperature=0.1, max_tokens=1000)
            client = client.bind(response_format={"type": "json_object"})
            res = await client.ainvoke(
                [SystemMessage(content=system_prompt), HumanMessage(content=prompt)]
            )
            return json.loads(str(res.content))

        return await self._execute_with_retry(_call, estimated_tokens=estimated_tokens)

    async def reduce_projects(
        self,
        projects: list[str],
        target_count: int = 3,
        role_context: str = "",
    ) -> list[str]:
        if not projects:
            return ["Distributed Services Platform", "High-Throughput Data Pipeline"]
        if len(projects) <= target_count:
            return projects

        system_prompt = (
            "You are a map-reduce project summarizer. Reduce the provided list of projects to the top N most representative, high-scale projects. "
            "Return strict JSON with field: 'top_projects' (array of strings)."
        )
        prompt = (
            f"Role Context: {role_context}\n"
            f"Target count: {target_count}\n"
            f"Candidate Projects: {json.dumps(projects)}"
        )
        estimated_tokens = len(prompt.split()) + 200

        async def _call():
            if not self.api_key or self.api_key == "mock-groq-key":
                return projects[:target_count]

            client = self._get_client(temperature=0.1, max_tokens=600)
            client = client.bind(response_format={"type": "json_object"})
            res = await client.ainvoke(
                [SystemMessage(content=system_prompt), HumanMessage(content=prompt)]
            )
            parsed = json.loads(str(res.content))
            return parsed.get("top_projects", projects[:target_count])

        return await self._execute_with_retry(_call, estimated_tokens=estimated_tokens)

    async def screen_candidate(
        self,
        jd_text: str,
        resume_text: str,
        candidate_name: str = "Candidate",
    ) -> ScreenResult:
        """
        Screen candidate resume directly against the Job Description.
        If matched, returns matched=True and verdict='yes'.
        If not matched, returns matched=False and verdict=<personalized rejection email body explaining what is missing>.
        Internship experience does not count as professional full-time experience.
        If some skills match, candidate is not rejected on skills.
        """
        if not self.api_key or self.api_key == "mock-groq-key":
            return ScreenResult(
                matched=True,
                verdict="yes",
                reason="Candidate matched required experience and relevant skills (mock Groq).",
                model_name=self.model_name,
            )

        system_prompt = (
            "You are an expert technical hiring manager conducting strict initial resume screening against a Job Description.\n\n"
            "EVALUATION RULES:\n"
            "1. EXPERIENCE LEVEL CHECK (STRICT):\n"
            "   - Check the required professional experience level / years of experience required by the Job Description.\n"
            "   - Calculate the candidate's actual professional full-time working experience.\n"
            "   - CRITICAL: Internship experience does NOT count as professional full-time experience.\n"
            "   - If the candidate does NOT possess the required professional full-time experience level, they FAIL the screening—even if their projects or skills match.\n\n"
            "2. SKILL MATCHING (FLEXIBLE):\n"
            "   - If the candidate meets the required full-time experience level, check their technical skills against the Job Description.\n"
            "   - RULE: If some skills match, DO NOT reject the candidate. If they meet the experience requirement and have relevant matching skills, they PASS.\n"
            "   - Only fail the candidate on skills if they completely lack the core technical qualifications required by the Job Description.\n\n"
            "OUTPUT FORMAT REQUIREMENTS (STRICT):\n"
            "- IF THE CANDIDATE MATCHES:\n"
            "  Reply with ONLY the single word:\n"
            "  yes\n\n"
            "- IF THE CANDIDATE DOES NOT MATCH:\n"
            "  Write ONLY the body text of a personalized email explaining constructively and specifically what qualifications the candidate is missing.\n"
            "  * If rejected due to experience: Explain specifically that their professional full-time experience does not meet the minimum required experience level for this role, noting that internship experience cannot be counted toward the required professional full-time experience.\n"
            "  * If rejected due to missing skills: Specifically identify the essential requirements from the Job Description that were absent from their resume.\n"
            "  * Output ONLY the body paragraphs. Do NOT include a Subject line, greetings like 'Dear...', placeholders like [Candidate Name], or closing sign-offs like 'Sincerely' or 'Best regards'."
        )

        prompt = (
            f"Candidate Name: {candidate_name}\n\n"
            f"JOB DESCRIPTION:\n{jd_text}\n\n"
            f"CANDIDATE RESUME:\n{resume_text}\n\n"
            "Evaluate this candidate against the Job Description strictly adhering to the rules."
        )

        estimated_tokens = len(prompt.split()) + 400

        async def _call():
            client = self._get_client(temperature=0.1, max_tokens=1000)
            res = await client.ainvoke(
                [SystemMessage(content=system_prompt), HumanMessage(content=prompt)]
            )
            return str(res.content).strip()

        raw_output = await self._execute_with_retry(
            _call, estimated_tokens=estimated_tokens
        )
        cleaned = raw_output.strip() if raw_output else ""

        lower_cleaned = cleaned.lower()
        if lower_cleaned == "yes" or (
            lower_cleaned.startswith("yes") and len(lower_cleaned) <= 10
        ):
            return ScreenResult(
                matched=True,
                verdict="yes",
                reason="Candidate matched required experience and relevant skills.",
                model_name=self.model_name,
            )

        if not cleaned:
            cleaned = (
                "After careful review of your application against the Job Description, "
                "we determined that your qualifications do not meet the minimum experience requirements "
                "or core competencies required for this role at this time."
            )

        return ScreenResult(
            matched=False,
            verdict=cleaned,
            reason="Candidate does not satisfy role experience or skill requirements.",
            model_name=self.model_name,
        )

    async def polish_job_description(self, jd_text: str) -> str:
        system_prompt = (
            "You are an expert AI recruiting assistant specializing in distilling and polishing job descriptions. "
            "Your objective is to remove all unnecessary company fluff, marketing backstory, office perks/amenities, "
            "and boilerplate legal/EEO disclosures to reduce token usage and improve AI screening accuracy. "
            "Extract and structure ONLY the essential role requirements:\n"
            "1. Role Overview (1-2 sentences summarizing the role scope and seniority)\n"
            "2. Key Responsibilities (bulleted actionable duties)\n"
            "3. Required Qualifications & Experience (strict years of professional experience, non-negotiable tech stack, tools, degree/background)\n"
            "4. Preferred Qualifications (nice-to-have skills, certifications, domain experience)\n\n"
            "STRICT RULES:\n"
            "- Strip out all company background stories ('About Us', 'Our Story', 'Why Join Us'), office perks (free lunch, snacks, gym), benefits/insurance details, and boilerplate legal/EEO statements.\n"
            "- Retain all technical keywords, programming languages, libraries, databases, architectures, and required experience levels.\n"
            "- Return ONLY the clean, structured markdown job description text. No introductory remarks, conversational replies, or meta-comments."
        )

        prompt = f"RAW JOB DESCRIPTION:\n{jd_text}\n\nPolish this job description according to the rules:"
        estimated_tokens = len(prompt.split()) + 400

        async def _call():
            client = self._get_client(temperature=0.1, max_tokens=1500)
            res = await client.ainvoke(
                [SystemMessage(content=system_prompt), HumanMessage(content=prompt)]
            )
            return str(res.content).strip()

        raw_output = await self._execute_with_retry(
            _call, estimated_tokens=estimated_tokens
        )
        cleaned = raw_output.strip() if raw_output else ""
        return cleaned if cleaned else jd_text.strip()
