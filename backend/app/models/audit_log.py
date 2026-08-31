from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, UUIDMixin, utc_now


class AuditLog(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "audit_logs"

    candidate_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("candidates.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    action: Mapped[str] = mapped_column(String(255), nullable=False)
    actor: Mapped[str] = mapped_column(
        String(255), default="AI Evaluator", nullable=False
    )
    actor_type: Mapped[str] = mapped_column(
        String(50), default="ai", nullable=False
    )  # ai, recruiter, system
    detail: Mapped[str] = mapped_column(Text, default="", nullable=False)

    # Internal explainability and governance fields
    prompt_template_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    model_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    model_input_snapshot: Mapped[str | None] = mapped_column(Text, nullable=True)
    model_output_raw: Mapped[str | None] = mapped_column(Text, nullable=True)
    final_decision: Mapped[str | None] = mapped_column(String(100), nullable=True)

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False, index=True
    )

    # Relationships
    candidate: Mapped["Candidate"] = relationship(
        "Candidate", back_populates="audit_logs"
    )

    __table_args__ = (
        Index("ix_audit_logs_candidate_timestamp", "candidate_id", "timestamp"),
    )
