import logging
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID
from datetime import datetime, timedelta

from app.db.session import get_db
from app.db.models import (
    ChatMessage, ChatSession, KnowledgeEntry, UnansweredQuestion, User
)
from app.core.security import require_owner

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary")
async def analytics_summary(
    current_user: dict = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    business_id = UUID(current_user["business_id"])
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)

    q_today = await db.execute(
        select(func.count(ChatMessage.id))
        .join(ChatSession, ChatMessage.session_id == ChatSession.id)
        .where(
            ChatSession.business_id == business_id,
            ChatMessage.role == "user",
            ChatMessage.created_at >= today_start,
        )
    )
    total_today = q_today.scalar() or 0

    q_week = await db.execute(
        select(func.count(ChatMessage.id))
        .join(ChatSession, ChatMessage.session_id == ChatSession.id)
        .where(
            ChatSession.business_id == business_id,
            ChatMessage.role == "user",
            ChatMessage.created_at >= week_start,
        )
    )
    total_week = q_week.scalar() or 0

    unanswered = await db.execute(
        select(func.count(UnansweredQuestion.id)).where(
            UnansweredQuestion.business_id == business_id,
            UnansweredQuestion.resolved == False,
        )
    )
    unanswered_count = unanswered.scalar() or 0

    total_unanswered_all = await db.execute(
        select(func.count(UnansweredQuestion.id)).where(
            UnansweredQuestion.business_id == business_id,
        )
    )
    total_un = total_unanswered_all.scalar() or 0
    resolution_rate = 1.0 - (unanswered_count / total_un) if total_un > 0 else 1.0

    knowledge_count = await db.execute(
        select(func.count(KnowledgeEntry.id)).where(
            KnowledgeEntry.business_id == business_id,
            KnowledgeEntry.is_active == True,
        )
    )
    k_count = knowledge_count.scalar() or 0

    k_growth = await db.execute(
        select(func.count(KnowledgeEntry.id)).where(
            KnowledgeEntry.business_id == business_id,
            KnowledgeEntry.is_active == True,
            KnowledgeEntry.created_at >= week_start,
        )
    )
    growth = k_growth.scalar() or 0

    active_emp = await db.execute(
        select(func.count(func.distinct(ChatSession.user_id))).where(
            ChatSession.business_id == business_id,
            ChatSession.started_at >= today_start,
        )
    )
    active_today = active_emp.scalar() or 0

    return {
        "total_questions_today": total_today,
        "total_questions_week": total_week,
        "resolution_rate": round(resolution_rate, 2),
        "unanswered_pending": unanswered_count,
        "knowledge_entries_count": k_count,
        "knowledge_growth_week": growth,
        "active_employees_today": active_today,
    }


@router.get("/knowledge-usage")
async def knowledge_usage(
    current_user: dict = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    business_id = UUID(current_user["business_id"])

    top_used = await db.execute(
        select(KnowledgeEntry)
        .where(
            KnowledgeEntry.business_id == business_id,
            KnowledgeEntry.is_active == True,
        )
        .order_by(KnowledgeEntry.usage_count.desc())
        .limit(10)
    )

    never_used = await db.execute(
        select(KnowledgeEntry)
        .where(
            KnowledgeEntry.business_id == business_id,
            KnowledgeEntry.is_active == True,
            KnowledgeEntry.usage_count == 0,
        )
        .order_by(KnowledgeEntry.created_at.asc())
        .limit(10)
    )

    return {
        "top_used": [
            {"id": str(e.id), "fact": e.processed_fact, "usage_count": e.usage_count, "category": e.category}
            for e in top_used.scalars().all()
        ],
        "never_used": [
            {"id": str(e.id), "fact": e.processed_fact, "category": e.category, "created_at": e.created_at.isoformat()}
            for e in never_used.scalars().all()
        ],
    }
