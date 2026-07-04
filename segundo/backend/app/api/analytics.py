import logging
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID
from datetime import datetime, timedelta

from app.db.session import get_db
from app.db.models import (
    Agent, ChatMessage, ChatSession, KnowledgeEntry, Mission, MissionTask,
    UnansweredQuestion, User
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


def _last_months(n: int, now: datetime) -> list[str]:
    """Devuelve las claves 'YYYY-MM' de los últimos n meses, incluyendo el actual."""
    months = []
    year, month = now.year, now.month
    for _ in range(n):
        months.append(f"{year:04d}-{month:02d}")
        month -= 1
        if month == 0:
            month = 12
            year -= 1
    return list(reversed(months))


@router.get("/missions")
async def missions_analytics(
    current_user: dict = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    business_id = UUID(current_user["business_id"])
    now = datetime.utcnow()

    # --- Misiones por mes (últimos 6 meses, incluyendo el actual) ---
    months = _last_months(6, now)
    first_year, first_month = (int(p) for p in months[0].split("-"))
    window_start = datetime(first_year, first_month, 1)

    month_expr = func.to_char(Mission.created_at, "YYYY-MM")
    q_months = await db.execute(
        select(month_expr, func.count(Mission.id))
        .where(
            Mission.business_id == business_id,
            Mission.created_at >= window_start,
        )
        .group_by(month_expr)
    )
    counts_by_month = {row[0]: row[1] for row in q_months.all()}
    missions_by_month = [
        {"month": m, "count": counts_by_month.get(m, 0)} for m in months
    ]

    # --- Misiones por estado ---
    q_status = await db.execute(
        select(Mission.status, func.count(Mission.id))
        .where(Mission.business_id == business_id)
        .group_by(Mission.status)
    )
    missions_by_status = {row[0]: row[1] for row in q_status.all()}

    # --- Tasa de aprobación de tareas (approved / (approved + failed)) ---
    q_tasks = await db.execute(
        select(
            func.count(MissionTask.id).filter(MissionTask.status == "approved"),
            func.count(MissionTask.id).filter(
                MissionTask.status.in_(["approved", "failed"])
            ),
        )
        .join(Mission, MissionTask.mission_id == Mission.id)
        .where(Mission.business_id == business_id)
    )
    approved_count, terminal_count = q_tasks.one()
    task_approval_rate = (
        round(approved_count / terminal_count, 2) if terminal_count else None
    )

    # --- Top 5 agentes por tareas aprobadas ---
    approved_tasks = func.count(MissionTask.id).label("tasks_approved")
    q_top = await db.execute(
        select(Agent.id, Agent.name, approved_tasks)
        .join(MissionTask, MissionTask.agent_id == Agent.id)
        .join(Mission, MissionTask.mission_id == Mission.id)
        .where(
            Mission.business_id == business_id,
            Agent.business_id == business_id,
            MissionTask.status == "approved",
        )
        .group_by(Agent.id, Agent.name)
        .order_by(approved_tasks.desc())
        .limit(5)
    )
    top_agents = [
        {"agent_id": str(row[0]), "name": row[1], "tasks_approved": row[2]}
        for row in q_top.all()
    ]

    # --- Duración promedio de misiones terminadas (segundos) ---
    q_duration = await db.execute(
        select(
            func.avg(
                func.extract("epoch", Mission.finished_at - Mission.started_at)
            )
        ).where(
            Mission.business_id == business_id,
            Mission.started_at.isnot(None),
            Mission.finished_at.isnot(None),
        )
    )
    avg_duration = q_duration.scalar()
    avg_mission_duration_seconds = (
        round(float(avg_duration), 1) if avg_duration is not None else None
    )

    return {
        "missions_by_month": missions_by_month,
        "missions_by_status": missions_by_status,
        "task_approval_rate": task_approval_rate,
        "top_agents": top_agents,
        "avg_mission_duration_seconds": avg_mission_duration_seconds,
    }
