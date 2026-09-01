import uuid
from datetime import datetime
from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector
from app.models.base import Base, TimestampMixin, utc_now


class Candidate(Base, TimestampMixin):
    __tablename__ = "candidates"

    id: Mapped[str] = mapped_column(
        String(255), primary_key=True, index=True
    )
    role_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("roles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)

    def __init__(self, **kwargs):
        if "email" in kwargs and kwargs["email"]:
            clean_email = str(kwargs["email"]).strip().lower()
            kwargs["email"] = clean_email
            if "id" not in kwargs or not kwargs["id"]:
                kwargs["id"] = clean_email
        elif "id" not in kwargs or not kwargs["id"]:
            kwargs["id"] = str(uuid.uuid4())
        super().__init__(**kwargs)
    phone: Mapped[str] = mapped_column(String(50), default="", nullable=False)
    avatar_url: Mapped[str] = mapped_column(String(1024), default="", nullable=False)
    resume_url: Mapped[str] = mapped_column(String(1024), default="", nullable=False)
    resume_text: Mapped[str] = mapped_column(Text, default="", nullable=False)

    # Vector embedding
    resume_embedding = mapped_column(Vector(1536), nullable=True)

    status: Mapped[str] = mapped_column(
        String(50), default="applied", nullable=False, index=True
    )  # applied, screened, tested, interviewed, hired, rejected
    current_round: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    overall_score: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False, index=True
    )
    applied_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False, index=True
    )
    experience_years: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    current_company: Mapped[str] = mapped_column(
        String(255), default="", nullable=False
    )
    skills = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), default=list, nullable=False
    )
    projects = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), default=list, nullable=False
    )
    education: Mapped[str] = mapped_column(Text, default="", nullable=False)
    location: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    ai_match_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    consent_on_file: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    role: Mapped["Role"] = relationship("Role", back_populates="candidates")
    round_results: Mapped[list["RoundResult"]] = relationship(
        "RoundResult",
        back_populates="candidate",
        cascade="all, delete-orphan",
        order_by="RoundResult.evaluated_at",
    )
    audit_logs: Mapped[list["AuditLog"]] = relationship(
        "AuditLog",
        back_populates="candidate",
        cascade="all, delete-orphan",
        order_by="AuditLog.timestamp.desc()",
    )
    mail_queue_items: Mapped[list["MailQueue"]] = relationship(
        "MailQueue", back_populates="candidate", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("role_id", "email", name="uq_candidates_role_email"),
        Index("ix_candidates_role_status", "role_id", "status"),
        Index("ix_candidates_role_score", "role_id", "overall_score"),
    )
