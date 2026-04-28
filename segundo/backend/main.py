import logging
import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.core.config import settings
from app.api import auth, teach, ask, knowledge, invite, unanswered
from app.api.proposals import router as proposals_router
from app.api.briefing import router as briefing_router
from app.api.transcribe import router as transcribe_router
from app.api.notifications import router as notifications_router
from app.api.analytics import router as analytics_router
from app.api.templates import router as templates_router
from app.api.bulk import router as bulk_router

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(name)s: %(message)s',
)
logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="Segundo API", version="2.1.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration_ms = round((time.time() - start) * 1000, 2)
    if request.url.path != "/health":
        logger.info("%s %s %d %sms", request.method, request.url.path, response.status_code, duration_ms)
    return response


app.include_router(auth.router)
app.include_router(teach.router)
app.include_router(ask.router)
app.include_router(knowledge.router)
app.include_router(invite.router)
app.include_router(unanswered.router)
app.include_router(proposals_router)
app.include_router(briefing_router)
app.include_router(transcribe_router)
app.include_router(notifications_router)
app.include_router(analytics_router)
app.include_router(templates_router)
app.include_router(bulk_router)


@app.post("/admin/clear-cache")
async def clear_cache():
    from app.services.embeddings import clear_embedding_cache
    clear_embedding_cache()
    return {"cleared": True}


@app.get("/health")
async def health():
    from app.db.session import engine
    pool = engine.pool
    return {
        "status": "ok",
        "version": "2.1.0",
        "db_pool_size": pool.size(),
        "db_pool_checkedout": pool.checkedout(),
    }
