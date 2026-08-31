from fastapi import APIRouter
from app.api.v1.attention import router as attention_router
from app.api.v1.audit import router as audit_router
from app.api.v1.auth import router as auth_router
from app.api.v1.benchmark import router as benchmark_router
from app.api.v1.candidates import router as candidates_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.decisions import router as decisions_router
from app.api.v1.events import router as events_router
from app.api.v1.org import router as org_router
from app.api.v1.reports import router as reports_router
from app.api.v1.roles import router as roles_router
from app.api.v1.upload import router as upload_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(dashboard_router)
api_router.include_router(roles_router)
api_router.include_router(candidates_router)
api_router.include_router(decisions_router)
api_router.include_router(audit_router)
api_router.include_router(reports_router)
api_router.include_router(upload_router)
api_router.include_router(org_router)
api_router.include_router(events_router)
api_router.include_router(benchmark_router)
api_router.include_router(attention_router)
