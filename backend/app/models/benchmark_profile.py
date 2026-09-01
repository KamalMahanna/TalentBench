from sqlalchemy import Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector
from app.models.base import Base, TimestampMixin, UUIDMixin


class BenchmarkProfile(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "benchmark_profiles"

    role_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("roles.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    source_type: Mapped[str] = mapped_column(
        String(50), default="jd_derived", nullable=False
    )  # jd_derived, historical_hire, manual

    shortlisted_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    avg_resume_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    avg_test_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    avg_interview_score: Mapped[float] = mapped_column(
        Float, default=0.0, nullable=False
    )
    top_skills = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), default=list, nullable=False
    )
    top_projects = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), default=list, nullable=False
    )
    avg_experience_years: Mapped[float] = mapped_column(
        Float, default=0.0, nullable=False
    )

    # Internal scoring weights and vectors
    skill_weights = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), default=dict, nullable=False
    )
    profile_embedding = mapped_column(Vector(1536), nullable=True)

    # Relationships
    role: Mapped["Role"] = relationship("Role", back_populates="benchmark_profile")
