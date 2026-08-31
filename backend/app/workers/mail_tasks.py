import asyncio
from datetime import datetime, timezone
import structlog
from app.database import get_sync_db
from app.models import AuditLog, Candidate, JobStatus, MailQueue, Role, Round
from app.services.mail_service import mail_service
from app.workers.celery_app import celery_app

logger = structlog.get_logger()


@celery_app.task(
    bind=True,
    max_retries=3,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_jitter=True,
)
def queue_and_send_candidate_mail(
    self,
    candidate_id: str,
    mail_type: str,  # "invitation" or "gap_feedback"
    round_id: str | None = None,
    context: dict | None = None,
):
    """
    Generate personalized mail with Jinja2 + LLM, log to AuditLog, and send.
    """
    db = get_sync_db()
    try:
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if not candidate:
            raise ValueError(f"Candidate {candidate_id} not found")

        role = db.query(Role).filter(Role.id == candidate.role_id).first()
        role_title = role.title if role else "Position"

        round_name = "Next Round"
        cutoff = 60
        if round_id:
            round_obj = db.query(Round).filter(Round.id == round_id).first()
            if round_obj:
                round_name = round_obj.name
                cutoff = round_obj.cutoff_threshold

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            if mail_type == "invitation":
                mail_data = loop.run_until_complete(
                    mail_service.generate_invitation_mail(
                        candidate_name=candidate.name,
                        role_title=role_title,
                        round_name=round_name,
                        candidate_skills=candidate.skills or [],
                    )
                )
            else:
                mail_data = loop.run_until_complete(
                    mail_service.generate_gap_mail(
                        candidate_name=candidate.name,
                        role_title=role_title,
                        round_name=round_name,
                        candidate_score=candidate.overall_score,
                        cutoff_threshold=cutoff,
                        gap_summary="Key technical competency requirements in production systems.",
                    )
                )

            # Record in MailQueue
            mail_entry = MailQueue(
                candidate_id=candidate.id,
                template_name=mail_type,
                recipient_email=candidate.email,
                recipient_name=candidate.name,
                subject=mail_data["subject"],
                body_html=mail_data["body"],
                body_text=mail_data["body"],
                status="sent",
                sent_at=datetime.now(timezone.utc),
            )
            db.add(mail_entry)

            # Record in AuditLog
            audit = AuditLog(
                candidate_id=candidate.id,
                action=f"Mail sent: {mail_type}",
                actor="System",
                actor_type="system",
                detail=f"Subject: {mail_data['subject']}. Personalization: {mail_data['personalized_section']}",
                timestamp=datetime.now(timezone.utc),
            )
            db.add(audit)

            # Send mail
            loop.run_until_complete(
                mail_service.send_mail(
                    to_email=candidate.email,
                    subject=mail_data["subject"],
                    body=mail_data["body"],
                )
            )

            db.commit()
            return {
                "status": "sent",
                "candidate_id": candidate_id,
                "mail_type": mail_type,
            }
        finally:
            loop.close()

    except Exception as exc:
        db.rollback()
        logger.error(
            "mail_generation_failed", candidate_id=candidate_id, error=str(exc)
        )
        raise self.retry(exc=exc)
    finally:
        db.close()
