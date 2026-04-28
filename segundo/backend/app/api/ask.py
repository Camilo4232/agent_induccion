from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.db.session import get_db
from app.db.models import Business, ChatMessage, ChatSession
from app.db.schemas import AskRequest, AskResponse, ChatMessageOut
from app.core.security import require_employee
from app.agents.orchestrator import handle_ask


def _get_user_rate_key(request: Request) -> str:
    """Extrae user_id del JWT para rate limiting por usuario; fallback a IP."""
    try:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            from app.core.security import decode_token
            payload = decode_token(auth.replace("Bearer ", ""))
            return f"user:{payload.get('sub', 'unknown')}"
    except Exception:
        pass
    return get_remote_address(request)


limiter = Limiter(key_func=_get_user_rate_key)

router = APIRouter(tags=["ask"])


@router.post("/ask", response_model=AskResponse)
@limiter.limit("10/minute")
async def ask(
    request: Request,
    body: AskRequest,
    current_user: dict = Depends(require_employee),
    db: AsyncSession = Depends(get_db),
):
    business_id = UUID(current_user["business_id"])
    user_id = UUID(current_user["sub"])

    result = await db.execute(select(Business).where(Business.id == business_id))
    business = result.scalar_one_or_none()
    business_name = business.name if business else "el negocio"

    return await handle_ask(
        question=body.question,
        user_id=user_id,
        business_id=business_id,
        business_name=business_name,
        session_id_str=body.session_id,
        db=db,
        role=current_user.get("role", "employee"),
    )


@router.get("/sessions")
async def list_sessions(
    current_user: dict = Depends(require_employee),
    db: AsyncSession = Depends(get_db),
):
    """List user's recent chat sessions with a preview."""
    user_id = UUID(current_user["sub"])
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == user_id)
        .order_by(ChatSession.started_at.desc())
        .limit(20)
    )
    sessions = result.scalars().all()

    # Get first message for each session as preview
    session_data = []
    for s in sessions:
        msg_result = await db.execute(
            select(ChatMessage.content)
            .where(ChatMessage.session_id == s.id, ChatMessage.role == "user")
            .order_by(ChatMessage.created_at.asc())
            .limit(1)
        )
        first_msg = msg_result.scalar_one_or_none()
        session_data.append({
            "id": str(s.id),
            "started_at": s.started_at.isoformat() if s.started_at else None,
            "preview": (first_msg[:80] + "...") if first_msg and len(first_msg) > 80 else first_msg,
        })

    return session_data


@router.get("/sessions/{session_id}/history", response_model=list[ChatMessageOut])
async def session_history(
    session_id: str,
    current_user: dict = Depends(require_employee),
    db: AsyncSession = Depends(get_db),
):
    user_id = UUID(current_user["sub"])
    result = await db.execute(
        select(ChatMessage)
        .join(ChatSession, ChatMessage.session_id == ChatSession.id)
        .where(
            ChatSession.id == UUID(session_id),
            ChatSession.user_id == user_id,
        )
        .order_by(ChatMessage.created_at.asc())
    )
    return result.scalars().all()
