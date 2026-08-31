from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector
from app.models.base import Base, TimestampMixin, UUIDMixin


class Role(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "roles"

    org_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    department: Mapped[str] = mapped_column(
        String(100), default="Engineering", nullable=False
    )
    location: Mapped[str] = mapped_column(String(255), default="Remote", nullable=False)
    employment_type: Mapped[str] = mapped_column(
        String(50), default="Full-time", nullable=False
    )
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    status: Mapped[str] = mapped_column(
        String(50), default="draft", nullable=False, index=True
    )  # draft, active, closed, archived
    applicant_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Embedding & skill representation
    jd_embedding = mapped_column(Vector(1536), nullable=True)
    extracted_skills = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), default=list, nullable=False
    )

    # Relationships
    organization: Mapped["Organization"] = relationship(
        "Organization", back_populates="roles"
    )
    rounds: Mapped[list["Round"]] = relationship(
        "Round",
        back_populates="role",
        cascade="all, delete-orphan",
        order_by="Round.order",
    )
    candidates: Mapped[list["Candidate"]] = relationship(
        "Candidate", back_populates="role", cascade="all, delete-orphan"
    )
    benchmark_profile: Mapped["BenchmarkProfile"] = relationship(
        "BenchmarkProfile",
        back_populates="role",
        uselist=False,
        cascade="all, delete-orphan",
    )
