"""Initial database schema with pgvector

Revision ID: 001_initial_schema
Revises:
Create Date: 2026-08-31 00:00:00.000000

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import pgvector

revision: str = "001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Organizations
    op.create_table(
        "organizations",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column(
            "logo_url", sa.String(length=1024), nullable=False, server_default=""
        ),
        sa.Column("plan", sa.String(length=50), nullable=False, server_default="pro"),
        sa.Column("seats_used", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("seats_total", sa.Integer(), nullable=False, server_default="15"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_organizations_id"), "organizations", ["id"], unique=False)

    # Users
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("org_id", sa.String(length=36), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column(
            "avatar_url", sa.String(length=1024), nullable=False, server_default=""
        ),
        sa.Column(
            "role", sa.String(length=50), nullable=False, server_default="recruiter"
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)
    op.create_index(op.f("ix_users_org_id"), "users", ["org_id"], unique=False)

    # Org Members
    op.create_table(
        "org_members",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("org_id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column(
            "role", sa.String(length=50), nullable=False, server_default="recruiter"
        ),
        sa.Column(
            "avatar_url", sa.String(length=1024), nullable=False, server_default=""
        ),
        sa.Column("last_active", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_org_members_email"), "org_members", ["email"], unique=False
    )
    op.create_index(op.f("ix_org_members_id"), "org_members", ["id"], unique=False)
    op.create_index(
        op.f("ix_org_members_org_id"), "org_members", ["org_id"], unique=False
    )

    # Roles
    op.create_table(
        "roles",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("org_id", sa.String(length=36), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column(
            "department",
            sa.String(length=100),
            nullable=False,
            server_default="Engineering",
        ),
        sa.Column(
            "location", sa.String(length=255), nullable=False, server_default="Remote"
        ),
        sa.Column(
            "employment_type",
            sa.String(length=50),
            nullable=False,
            server_default="Full-time",
        ),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column(
            "status", sa.String(length=50), nullable=False, server_default="draft"
        ),
        sa.Column("applicant_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("jd_embedding", pgvector.sqlalchemy.Vector(1536), nullable=True),
        sa.Column("extracted_skills", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_roles_id"), "roles", ["id"], unique=False)
    op.create_index(op.f("ix_roles_org_id"), "roles", ["org_id"], unique=False)
    op.create_index(op.f("ix_roles_status"), "roles", ["status"], unique=False)

    # Rounds
    op.create_table(
        "rounds",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("role_id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column(
            "type", sa.String(length=50), nullable=False, server_default="custom"
        ),
        sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "input_source",
            sa.String(length=50),
            nullable=False,
            server_default="manual_entry",
        ),
        sa.Column("ai_scored", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "cutoff_threshold", sa.Integer(), nullable=False, server_default="60"
        ),
        sa.Column("mail_template", sa.Text(), nullable=False, server_default=""),
        sa.Column("prompt_template_id", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_rounds_id"), "rounds", ["id"], unique=False)
    op.create_index(op.f("ix_rounds_role_id"), "rounds", ["role_id"], unique=False)

    # Candidates
    op.create_table(
        "candidates",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("role_id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=50), nullable=False, server_default=""),
        sa.Column(
            "avatar_url", sa.String(length=1024), nullable=False, server_default=""
        ),
        sa.Column(
            "resume_url", sa.String(length=1024), nullable=False, server_default=""
        ),
        sa.Column("resume_text", sa.Text(), nullable=False, server_default=""),
        sa.Column("resume_embedding", pgvector.sqlalchemy.Vector(1536), nullable=True),
        sa.Column(
            "status", sa.String(length=50), nullable=False, server_default="applied"
        ),
        sa.Column("current_round", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("overall_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("applied_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("experience_years", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "current_company", sa.String(length=255), nullable=False, server_default=""
        ),
        sa.Column("skills", sa.JSON(), nullable=False),
        sa.Column("projects", sa.JSON(), nullable=False),
        sa.Column("education", sa.Text(), nullable=False, server_default=""),
        sa.Column("location", sa.String(length=255), nullable=False, server_default=""),
        sa.Column("ai_match_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "consent_on_file", sa.Boolean(), nullable=False, server_default="true"
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("role_id", "email", name="uq_candidates_role_email"),
    )
    op.create_index(
        op.f("ix_candidates_applied_at"), "candidates", ["applied_at"], unique=False
    )
    op.create_index(op.f("ix_candidates_email"), "candidates", ["email"], unique=False)
    op.create_index(op.f("ix_candidates_id"), "candidates", ["id"], unique=False)
    op.create_index(op.f("ix_candidates_name"), "candidates", ["name"], unique=False)
    op.create_index(
        op.f("ix_candidates_overall_score"),
        "candidates",
        ["overall_score"],
        unique=False,
    )
    op.create_index(
        op.f("ix_candidates_role_id"), "candidates", ["role_id"], unique=False
    )
    op.create_index(
        op.f("ix_candidates_status"), "candidates", ["status"], unique=False
    )
    op.create_index(
        "ix_candidates_role_status", "candidates", ["role_id", "status"], unique=False
    )
    op.create_index(
        "ix_candidates_role_score",
        "candidates",
        ["role_id", "overall_score"],
        unique=False,
    )

    # Round Results
    op.create_table(
        "round_results",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("candidate_id", sa.String(length=36), nullable=False),
        sa.Column("round_id", sa.String(length=36), nullable=False),
        sa.Column("round_name", sa.String(length=255), nullable=False),
        sa.Column("round_type", sa.String(length=50), nullable=False),
        sa.Column(
            "status", sa.String(length=50), nullable=False, server_default="pending"
        ),
        sa.Column("score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("ai_verdict", sa.Text(), nullable=False, server_default=""),
        sa.Column("ai_summary", sa.Text(), nullable=False, server_default=""),
        sa.Column("evaluated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("overridden", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("override_reason", sa.Text(), nullable=True),
        sa.Column("overridden_by", sa.String(length=255), nullable=True),
        sa.Column("overridden_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["candidate_id"], ["candidates.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["round_id"], ["rounds.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_round_results_candidate_id"),
        "round_results",
        ["candidate_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_round_results_evaluated_at"),
        "round_results",
        ["evaluated_at"],
        unique=False,
    )
    op.create_index(op.f("ix_round_results_id"), "round_results", ["id"], unique=False)
    op.create_index(
        op.f("ix_round_results_round_id"), "round_results", ["round_id"], unique=False
    )
    op.create_index(
        "ix_round_results_candidate_round",
        "round_results",
        ["candidate_id", "round_id"],
        unique=False,
    )

    # Benchmark Profiles
    op.create_table(
        "benchmark_profiles",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("role_id", sa.String(length=36), nullable=False),
        sa.Column(
            "source_type",
            sa.String(length=50),
            nullable=False,
            server_default="jd_derived",
        ),
        sa.Column(
            "shortlisted_count", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column("avg_resume_score", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("avg_test_score", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column(
            "avg_interview_score", sa.Float(), nullable=False, server_default="0.0"
        ),
        sa.Column("top_skills", sa.JSON(), nullable=False),
        sa.Column(
            "avg_experience_years", sa.Float(), nullable=False, server_default="0.0"
        ),
        sa.Column("skill_weights", sa.JSON(), nullable=False),
        sa.Column("profile_embedding", pgvector.sqlalchemy.Vector(1536), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("role_id"),
    )
    op.create_index(
        op.f("ix_benchmark_profiles_id"), "benchmark_profiles", ["id"], unique=False
    )
    op.create_index(
        op.f("ix_benchmark_profiles_role_id"),
        "benchmark_profiles",
        ["role_id"],
        unique=True,
    )

    # Audit Logs
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("candidate_id", sa.String(length=36), nullable=False),
        sa.Column("action", sa.String(length=255), nullable=False),
        sa.Column(
            "actor",
            sa.String(length=255),
            nullable=False,
            server_default="AI Evaluator",
        ),
        sa.Column(
            "actor_type", sa.String(length=50), nullable=False, server_default="ai"
        ),
        sa.Column("detail", sa.Text(), nullable=False, server_default=""),
        sa.Column("prompt_template_id", sa.String(length=100), nullable=True),
        sa.Column("model_name", sa.String(length=100), nullable=True),
        sa.Column("model_input_snapshot", sa.Text(), nullable=True),
        sa.Column("model_output_raw", sa.Text(), nullable=True),
        sa.Column("final_decision", sa.String(length=100), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["candidate_id"], ["candidates.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_audit_logs_candidate_id"), "audit_logs", ["candidate_id"], unique=False
    )
    op.create_index(op.f("ix_audit_logs_id"), "audit_logs", ["id"], unique=False)
    op.create_index(
        op.f("ix_audit_logs_timestamp"), "audit_logs", ["timestamp"], unique=False
    )
    op.create_index(
        "ix_audit_logs_candidate_timestamp",
        "audit_logs",
        ["candidate_id", "timestamp"],
        unique=False,
    )

    # Job Statuses (Checkpointing)
    op.create_table(
        "job_statuses",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("batch_id", sa.String(length=36), nullable=False),
        sa.Column("role_id", sa.String(length=36), nullable=True),
        sa.Column("candidate_id", sa.String(length=36), nullable=True),
        sa.Column("step", sa.String(length=50), nullable=False),
        sa.Column(
            "status", sa.String(length=50), nullable=False, server_default="pending"
        ),
        sa.Column("idempotency_key", sa.String(length=255), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_detail", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["candidate_id"], ["candidates.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_job_statuses_batch_id"), "job_statuses", ["batch_id"], unique=False
    )
    op.create_index(
        op.f("ix_job_statuses_candidate_id"),
        "job_statuses",
        ["candidate_id"],
        unique=False,
    )
    op.create_index(op.f("ix_job_statuses_id"), "job_statuses", ["id"], unique=False)
    op.create_index(
        op.f("ix_job_statuses_idempotency_key"),
        "job_statuses",
        ["idempotency_key"],
        unique=True,
    )
    op.create_index(
        op.f("ix_job_statuses_role_id"), "job_statuses", ["role_id"], unique=False
    )
    op.create_index(
        op.f("ix_job_statuses_status"), "job_statuses", ["status"], unique=False
    )
    op.create_index(
        "ix_job_statuses_batch_status",
        "job_statuses",
        ["batch_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_job_statuses_role_status",
        "job_statuses",
        ["role_id", "status"],
        unique=False,
    )

    # Mail Queue
    op.create_table(
        "mail_queue",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("candidate_id", sa.String(length=36), nullable=False),
        sa.Column("template_name", sa.String(length=100), nullable=False),
        sa.Column("recipient_email", sa.String(length=255), nullable=False),
        sa.Column("recipient_name", sa.String(length=255), nullable=False),
        sa.Column("subject", sa.String(length=500), nullable=False),
        sa.Column("body_html", sa.Text(), nullable=False),
        sa.Column("body_text", sa.Text(), nullable=False),
        sa.Column(
            "status", sa.String(length=50), nullable=False, server_default="pending"
        ),
        sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["candidate_id"], ["candidates.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_mail_queue_candidate_id"), "mail_queue", ["candidate_id"], unique=False
    )
    op.create_index(op.f("ix_mail_queue_id"), "mail_queue", ["id"], unique=False)
    op.create_index(
        op.f("ix_mail_queue_status"), "mail_queue", ["status"], unique=False
    )
    op.create_index(
        "ix_mail_queue_status_created",
        "mail_queue",
        ["status", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_table("mail_queue")
    op.drop_table("job_statuses")
    op.drop_table("audit_logs")
    op.drop_table("benchmark_profiles")
    op.drop_table("round_results")
    op.drop_table("candidates")
    op.drop_table("rounds")
    op.drop_table("roles")
    op.drop_table("org_members")
    op.drop_table("users")
    op.drop_table("organizations")
