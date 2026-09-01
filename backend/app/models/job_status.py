from sqlalchemy import ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin, UUIDMixin


class JobStatus(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "job_statuses"

    batch_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    role_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("roles.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    candidate_id: Mapped[str | None] = mapped_column(
        String(255),
        ForeignKey("candidates.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=True,
        index=True,
    )

    step: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # parse, embed, score, mail, report
    status: Mapped[str] = mapped_column(
        String(50), default="pending", nullable=False, index=True
    )  # pending, running, completed, failed, dead_letter
    idempotency_key: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )

    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_detail: Mapped[str | None] = mapped_column(Text, nullable=True)

    __table_args__ = (
        Index("ix_job_statuses_batch_status", "batch_id", "status"),
        Index("ix_job_statuses_role_status", "role_id", "status"),
    )
