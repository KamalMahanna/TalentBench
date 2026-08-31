import asyncio
from datetime import datetime, timezone
import structlog
from app.database import get_sync_db
from app.llm.providers.mock import MockLLMProvider
from app.models import AuditLog, Candidate, JobStatus, Role, Round, RoundResult
from app.workers.celery_app import celery_app
from app.workers.resume_tasks import publish_event

logger = structlog.get_logger()


@celery_app.task(
    bind=True,
    max_retries=3,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_jitter=True,
)
def evaluate_candidate_round(
    self,
    candidate_id: str,
    round_id: str,
    raw_input_data: dict,
):
    """
    Evaluate a candidate's round assessment (test result / interview) and record results + audit log.
    """
    db = get_sync_db()
    try:
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        round_obj = db.query(Round).filter(Round.id == round_id).first()
        if not candidate or not round_obj:
            raise ValueError(f"Candidate {candidate_id} or Round {round_id} not found")

        llm = MockLLMProvider()
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            eval_res = loop.run_until_complete(
                llm.evaluate(
                    round_type=round_obj.type,
                    rubric=f"Cutoff: {round_obj.cutoff_threshold}",
                    candidate_data={
                        "name": candidate.name,
                        "skills": candidate.skills,
                        "experience_years": candidate.experience_years,
                    },
                )
            )
        finally:
            loop.close()

        score = raw_input_data.get("score", eval_res.score)
        passed = score >= round_obj.cutoff_threshold

        round_res = RoundResult(
            candidate_id=candidate.id,
            round_id=round_obj.id,
            round_name=round_obj.name,
            round_type=round_obj.type,
            status="passed" if passed else "failed",
            score=score,
            ai_verdict=eval_res.verdict,
            ai_summary=eval_res.summary,
            evaluated_at=datetime.now(timezone.utc),
        )
        db.add(round_res)

        # AuditLog written before subsequent actions
        audit = AuditLog(
            candidate_id=candidate.id,
            action=f"Round evaluated: {round_obj.name}",
            actor="AI Evaluator",
            actor_type="ai",
            detail=eval_res.verdict,
            prompt_template_id=f"eval_{round_obj.type}_v1",
            model_name="mock-gpt-4o",
            model_input_snapshot=str(raw_input_data),
            model_output_raw=eval_res.raw_output,
            final_decision="passed" if passed else "failed",
            timestamp=datetime.now(timezone.utc),
        )
        db.add(audit)

        # Update candidate status
        if round_obj.type == "aptitude_test":
            candidate.status = "tested" if passed else "rejected"
        elif round_obj.type in ["dsa_round", "interview"]:
            candidate.status = "interviewed" if passed else "rejected"

        if passed:
            candidate.current_round = max(candidate.current_round, round_obj.order + 1)

        db.commit()

        # Publish SSE update
        publish_event(
            role_id=candidate.role_id,
            event_type="round_complete",
            payload={
                "candidate_id": candidate.id,
                "role_id": candidate.role_id,
                "status": candidate.status,
                "message": f"{candidate.name} completed {round_obj.name} ({'Passed' if passed else 'Failed'})",
            },
        )

        return {"candidate_id": candidate_id, "score": score, "passed": passed}

    except Exception as exc:
        db.rollback()
        logger.error(
            "evaluate_candidate_round_failed", candidate_id=candidate_id, error=str(exc)
        )
        raise self.retry(exc=exc)
    finally:
        db.close()
