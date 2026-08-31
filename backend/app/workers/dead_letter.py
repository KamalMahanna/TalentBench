from datetime import datetime, timezone
import structlog
from app.database import get_sync_db
from app.models import JobStatus
from app.workers.celery_app import celery_app

logger = structlog.get_logger()


@celery_app.task
def move_to_dead_letter_queue(job_id: str, error_message: str):
    """
    Move a permanently failed job to dead_letter status so it appears in recruiter's attention list.
    """
    db = get_sync_db()
    try:
        job = db.query(JobStatus).filter(JobStatus.id == job_id).first()
        if job:
            job.status = "dead_letter"
            job.error_detail = error_message
            job.updated_at = datetime.now(timezone.utc)
            db.commit()
            logger.warning("job_moved_to_dlq", job_id=job_id, error=error_message)
    finally:
        db.close()
