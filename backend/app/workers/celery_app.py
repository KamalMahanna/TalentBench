import os
from celery import Celery
from app.config import settings

celery_app = Celery(
    "talentbench",
    broker=settings.get_celery_broker_url,
    backend=settings.get_celery_result_backend,
    include=[
        "app.workers.resume_tasks",
        "app.workers.scoring_tasks",
        "app.workers.mail_tasks",
        "app.workers.benchmark_tasks",
        "app.workers.dead_letter",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,  # Ensure no task is dropped on worker crash
    worker_prefetch_multiplier=1,  # Fair queue scheduling for long-running AI tasks
    task_routes={
        "app.workers.resume_tasks.*": {"queue": "resume_queue"},
        "app.workers.scoring_tasks.*": {"queue": "scoring_queue"},
        "app.workers.mail_tasks.*": {"queue": "mail_queue"},
        "app.workers.benchmark_tasks.*": {"queue": "benchmark_queue"},
        "app.workers.dead_letter.*": {"queue": "dlq_queue"},
    },
)
