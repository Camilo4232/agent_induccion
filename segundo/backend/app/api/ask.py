from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.db.session import get_db
from app.db.models import Business, ChatMessage, ChatSession
from app.db.schemas import AskRequest, AskResponse, ChatMessageOut
from app.core.security import require_employee
from app.agents.orchestrator import handle_ask

router = APIRouter(tags=["ask"])


@router.post("/ask", response_model=AskResponse)
async def ask(
    body: AskRequest,
    current_user: dict = Depends(require_employee),
    db: AsyncSession = Depends(get_db),
):
    business_id = UUID(current_user["business_id"])
    user_id = UUID(current_user["sub"])

    # Get business name for the persona
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
