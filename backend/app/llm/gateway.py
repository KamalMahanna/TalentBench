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
