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

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="Segundo API", version="2.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

app.include_router(auth.router)
app.include_router(teach.router)
app.include_router(ask.router)
app.include_router(knowledge.router)
app.include_router(invite.router)
app.include_router(unanswered.router)
app.include_router(proposals_router)
app.include_router(briefing_router)
app.include_router(transcribe_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
