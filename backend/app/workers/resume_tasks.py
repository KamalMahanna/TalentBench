import asyncio
import json
import random
import time
from datetime import datetime, timezone
import redis
import structlog
from app.config import settings
from app.database import get_sync_db
from app.llm.providers.mock import MockLLMProvider
from app.models import (
    AuditLog,
    BenchmarkProfile,
    Candidate,
    JobStatus,
    Role,
    Round,
    RoundResult,
)
from app.parsing.embeddings import compute_jd_match_score
from app.parsing.pdf_parser import parse_pdf
from app.parsing.skill_extractor import extract_candidate_metadata
from app.storage.client import storage_client
from app.workers.celery_app import celery_app

logger = structlog.get_logger()


def get_redis_sync():
    return redis.from_url(
        settings.get_redis_url,
        decode_responses=True,
        socket_connect_timeout=0.2,
        socket_timeout=0.2,
    )


def publish_event(role_id: str, event_type: str, payload: dict):
    try:
        r = get_redis_sync()
        event_data = {
            "type": event_type,
            "payload": payload,
        }
        r.publish(f"talentbench:events:{role_id}", json.dumps(event_data))
    except Exception as e:
        logger.warning("failed_to_publish_event", error=str(e))


@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=5,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_jitter=True,
)
def process_single_candidate_resume(
    self,
    batch_id: str,
    role_id: str,
    candidate_id: str,
    resume_s3_key: str | None = None,
):
    """
    Process a single candidate's resume idempotently with checkpointing.
    """
    idempotency_key = f"{batch_id}:{candidate_id}:resume_screening"
    db = get_sync_db()

    try:
        # Check checkpoint status
        job = (
            db.query(JobStatus)
            .filter(JobStatus.idempotency_key == idempotency_key)
            .first()
        )
        if job and job.status == "completed":
            logger.info(
                "skipping_already_completed_candidate", candidate_id=candidate_id
            )
            return {"status": "already_completed", "candidate_id": candidate_id}

        if not job:
            job = JobStatus(
                batch_id=batch_id,
                role_id=role_id,
                candidate_id=candidate_id,
                step="resume_screening",
                status="running",
                idempotency_key=idempotency_key,
                attempts=1,
            )
            db.add(job)
            db.commit()
        else:
            job.status = "running"
            job.attempts += 1
            db.commit()

        # Load Candidate and Role
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        role = db.query(Role).filter(Role.id == role_id).first()
        if not candidate or not role:
            raise ValueError(f"Candidate {candidate_id} or Role {role_id} not found")

        # Extract text & metadata
        resume_text = candidate.resume_text
        if not resume_text and resume_s3_key:
            file_bytes = storage_client.download_file(
                storage_client.resume_bucket, resume_s3_key
            )
            resume_text = parse_pdf(file_bytes)
            candidate.resume_text = resume_text

        # LLM Metadata extraction & embedding
        llm = MockLLMProvider()
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            extracted = loop.run_until_complete(
                llm.extract_skills_and_projects(resume_text)
            )
            embedding = loop.run_until_complete(
                llm.embed(resume_text or "Software Engineer")
            )
        finally:
            loop.close()

        # Update candidate extracted info if not present
        if not candidate.skills:
            candidate.skills = extracted["skills"]
        if not candidate.projects:
            candidate.projects = extracted["projects"]
        if candidate.experience_years == 0:
            candidate.experience_years = extracted["experience_years"]
        if not candidate.current_company:
            candidate.current_company = extracted["current_company"]
        if not candidate.location:
            candidate.location = extracted["location"]

        # Calculate match score vs JD
        match_score = compute_jd_match_score(
            resume_embedding=embedding,
            jd_embedding=role.jd_embedding,
            candidate_skills=candidate.skills or [],
            required_skills=role.extracted_skills or [],
        )
        candidate.ai_match_score = match_score

        # Find the Resume Screen round
        resume_round = (
            db.query(Round)
            .filter(Round.role_id == role_id, Round.type == "resume_screen")
            .first()
        )

        cutoff = resume_round.cutoff_threshold if resume_round else 60
        passed = match_score >= cutoff

        # Create RoundResult
        round_res = RoundResult(
            candidate_id=candidate.id,
            round_id=resume_round.id if resume_round else "resume_round",
            round_name=resume_round.name if resume_round else "Resume Screen",
            round_type="resume_screen",
            status="passed" if passed else "failed",
            score=match_score,
            ai_verdict=(
                f"Candidate demonstrated {match_score}/100 alignment against role requirements."
                if passed
                else f"Score {match_score}/100 fell short of the {cutoff} cutoff benchmark."
            ),
            ai_summary=f"Resume screening evaluated key skills: {', '.join(candidate.skills[:4])}.",
            evaluated_at=datetime.now(timezone.utc),
        )
        db.add(round_res)

        # Write AuditLog BEFORE any mail or trigger action
        audit = AuditLog(
            candidate_id=candidate.id,
            action=f"Round evaluated: {round_res.round_name}",
            actor="AI Evaluator",
            actor_type="ai",
            detail=round_res.ai_verdict,
            prompt_template_id="resume_screen_v1",
            model_name="mock-gpt-4o",
            model_input_snapshot=f"Candidate: {candidate.name}, Skills: {candidate.skills}",
            model_output_raw=round_res.ai_verdict,
            final_decision="passed" if passed else "failed",
            timestamp=datetime.now(timezone.utc),
        )
        db.add(audit)

        # Update candidate overall status & score
        candidate.status = "screened" if passed else "rejected"
        candidate.overall_score = match_score
        if passed:
            candidate.current_round = 1

        # Mark job completed
        job.status = "completed"
        db.commit()

        # Publish live SSE update
        publish_event(
            role_id=role_id,
            event_type="candidate_status",
            payload={
                "candidate_id": candidate.id,
                "role_id": role_id,
                "status": candidate.status,
                "message": f"{candidate.name} {'cleared Resume Screen' if passed else 'screened'}",
            },
        )

        return {
            "status": "completed",
            "candidate_id": candidate_id,
            "passed": passed,
            "score": match_score,
        }

    except Exception as exc:
        db.rollback()
        logger.error(
            "resume_screening_failed", candidate_id=candidate_id, error=str(exc)
        )
        if job:
            job.status = "failed"
            job.error_detail = str(exc)
            try:
                db.commit()
            except Exception:
                pass
        raise self.retry(exc=exc)
    finally:
        db.close()


@celery_app.task
def process_batch_resumes(batch_id: str, role_id: str, candidate_ids: list[str]):
    """Orchestrate processing for a batch of candidate resumes."""
    logger.info(
        "starting_batch_resume_processing", batch_id=batch_id, count=len(candidate_ids)
    )
    for cid in candidate_ids:
        try:
            process_single_candidate_resume.delay(
                batch_id=batch_id,
                role_id=role_id,
                candidate_id=cid,
            )
        except Exception:
            pass
    return {"batch_id": batch_id, "enqueued": len(candidate_ids)}
