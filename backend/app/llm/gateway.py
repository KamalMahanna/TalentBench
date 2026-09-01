import hashlib
import json
from abc import ABC, abstractmethod
from typing import Any, AsyncIterator
from pydantic import BaseModel


class LLMResponse(BaseModel):
    text: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    model: str = "default"
    cached: bool = False


class EvalResponse(BaseModel):
    score: int
    verdict: str
    summary: str
    strengths: list[str] = []
    improvement_areas: list[str] = []
    category_scores: dict[str, int] = {}
    radar_scores: dict[str, int] = {}
    model_name: str = "default"
    raw_output: str = ""
    prompt_snapshot: str = ""


class ScreenResult(BaseModel):
    matched: bool
    verdict: str  # "yes" or rejection email body
    reason: str = ""
    model_name: str = "default"


class LLMGateway(ABC):
    """Abstract interface for all LLM interactions in TalentBench."""

    @abstractmethod
    async def complete(
        self,
        prompt: str,
        system_prompt: str = "You are an expert AI recruiter evaluating candidate assessments.",
        temperature: float = 0.2,
        max_tokens: int = 2048,
        json_mode: bool = False,
    ) -> LLMResponse:
        pass

    @abstractmethod
    async def evaluate(
        self,
        round_type: str,
        rubric: str,
        candidate_data: dict[str, Any],
        benchmark_data: dict[str, Any] | None = None,
        role_data: dict[str, Any] | None = None,
    ) -> EvalResponse:
        pass

    @abstractmethod
    async def embed(self, text: str) -> list[float]:
        pass

    @abstractmethod
    async def stream(
        self,
        prompt: str,
        system_prompt: str = "You are an expert recruitment assistant.",
    ) -> AsyncIterator[str]:
        pass

    @abstractmethod
    async def extract_skills_and_projects(
        self,
        resume_text: str,
    ) -> dict[str, Any]:
        """Extract structured skills, projects, experience, and education from resume text."""
        pass

    @abstractmethod
    async def reduce_projects(
        self,
        projects: list[str],
        target_count: int = 3,
        role_context: str = "",
    ) -> list[str]:
        """Token-bounded map-reduce over candidate projects to derive top representative projects."""
        pass

    @abstractmethod
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
        pass

    @abstractmethod
    async def polish_job_description(self, jd_text: str) -> str:
        """
        Clean and polish raw job description text by eliminating company background fluff,
        benefits/perks, and legal boilerplate, retaining only the high-signal role overview,
        key responsibilities, required qualifications, and core technical requirements.
        """
        pass
