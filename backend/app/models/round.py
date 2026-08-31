from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, UUIDMixin


class Round(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "rounds"

    role_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("roles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(
        String(50), default="custom", nullable=False
    )  # resume_screen, aptitude_test, dsa_round, interview, custom
    order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    input_source: Mapped[str] = mapped_column(
        String(50), default="manual_entry", nullable=False
    )  # excel_upload, manual_entry, ai_generated_link
    ai_scored: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    cutoff_threshold: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    mail_template: Mapped[str] = mapped_column(Text, default="", nullable=False)
    prompt_template_id: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Relationships
    role: Mapped["Role"] = relationship("Role", back_populates="rounds")
    round_results: Mapped[list["RoundResult"]] = relationship(
        "RoundResult", back_populates="round", cascade="all, delete-orphan"
    )
