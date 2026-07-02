"""
API de misiones — Segundo v3.

Crear/lanzar misiones en background, listarlas, ver el detalle (tareas +
timeline + equipo involucrado) y cancelarlas. Multi-tenant estricto por
business_id del token; solo el dueño puede lanzar o cancelar misiones.
"""
import asyncio
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.models import Agent, Mission, MissionTask, TaskEvent
from app.db.schemas import (
    AgentResponse,
    MissionCreate,
    MissionDetailResponse,
    MissionResponse,
    MissionTaskResponse,
    TaskEventResponse,
)
from app.core.security import get_current_user, require_owner
from app.services.mission_engine import (
    ACTIVE_MISSION_STATUSES,
    _add_event,
    run_mission,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/missions", tags=["missions"])

# Referencias fuertes a las tareas en background (evita que el GC las cancele)
_background_tasks: set[asyncio.Task] = set()


def _launch_mission_in_background(mission_id: UUID) -> None:
    task = asyncio.create_task(run_mission(mission_id))
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)


def _derive_title(body: MissionCreate) -> str:
    if body.title and body.title.strip():
        return body.title.strip()[:200]
    objective = body.objective.strip()
    if len(objective) <= 60:
        return objective
    return objective[:60].rstrip() + "…"


async def _get_business_mission(
    mission_id: UUID, business_id: UUID, db: AsyncSession
) -> Mission:
    result = await db.execute(
        select(Mission).where(
            Mission.id == mission_id,
            Mission.business_id == business_id,
        )
    )
    mission = result.scalar_one_or_none()
    if not mission:
        raise HTTPException(status_code=404, detail="Misión no encontrada")
    return mission


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("", response_model=MissionResponse, status_code=201)
async def create_mission(
    body: MissionCreate,
    current_user: dict = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    """Crea la misión y la lanza en background (el frontend hace polling)."""
    business_id = UUID(current_user["business_id"])
    user_id = UUID(current_user["sub"])

    mission = Mission(
        business_id=business_id,
        title=_derive_title(body),
        objective=body.objective.strip(),
        status="planning",
        created_by=user_id,
    )
    db.add(mission)
    await db.flush()

    _add_event(
        db, mission.id, "mission_created",
        payload={"title": mission.title, "objective": mission.objective[:300]},
    )
    await db.commit()
    await db.refresh(mission)

    _launch_mission_in_background(mission.id)
    logger.info("Misión %s creada y lanzada para negocio %s", mission.id, business_id)
    return mission


@router.get("", response_model=list[MissionResponse])
async def list_missions(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    business_id = UUID(current_user["business_id"])
    result = await db.execute(
        select(Mission)
        .where(Mission.business_id == business_id)
        .order_by(Mission.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{mission_id}", response_model=MissionDetailResponse)
async def get_mission(
    mission_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Detalle de la misión: tareas (con agente resuelto), timeline y equipo."""
    business_id = UUID(current_user["business_id"])
    mission = await _get_business_mission(mission_id, business_id, db)

    tasks_result = await db.execute(
        select(MissionTask)
        .where(MissionTask.mission_id == mission.id)
        .order_by(MissionTask.order_index, MissionTask.created_at)
    )
    tasks = list(tasks_result.scalars().all())

    events_result = await db.execute(
        select(TaskEvent)
        .where(TaskEvent.mission_id == mission.id)
        .order_by(TaskEvent.created_at)
    )
    events = list(events_result.scalars().all())

    # Equipo involucrado: manager + asignados/revisores de tareas + agentes de eventos
    agent_ids: set[UUID] = set()
    if mission.manager_agent_id:
        agent_ids.add(mission.manager_agent_id)
    for t in tasks:
        if t.agent_id:
            agent_ids.add(t.agent_id)
        if t.reviewer_agent_id:
            agent_ids.add(t.reviewer_agent_id)
    for e in events:
        if e.agent_id:
            agent_ids.add(e.agent_id)

    agents: list[Agent] = []
    if agent_ids:
        agents_result = await db.execute(
            select(Agent)
            .where(Agent.id.in_(agent_ids), Agent.business_id == business_id)
            .order_by(Agent.created_at)
        )
        agents = list(agents_result.scalars().all())

    agent_names = {a.id: a.name for a in agents}

    tasks_out: list[MissionTaskResponse] = []
    for t in tasks:
        task_out = MissionTaskResponse.model_validate(t)
        task_out.agent_name = agent_names.get(t.agent_id)
        tasks_out.append(task_out)

    agents_out: list[AgentResponse] = []
    for a in agents:
        if a.domain_scopes is None:
            a.domain_scopes = []
        agents_out.append(AgentResponse.model_validate(a))

    base = MissionResponse.model_validate(mission)
    return MissionDetailResponse(
        **base.model_dump(),
        tasks=tasks_out,
        events=[TaskEventResponse.model_validate(e) for e in events],
        agents=agents_out,
    )


@router.post("/{mission_id}/cancel", response_model=MissionResponse)
async def cancel_mission(
    mission_id: UUID,
    current_user: dict = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    """Cancela una misión en curso. Si ya terminó, responde 409."""
    business_id = UUID(current_user["business_id"])
    mission = await _get_business_mission(mission_id, business_id, db)

    if mission.status not in ACTIVE_MISSION_STATUSES:
        raise HTTPException(
            status_code=409,
            detail=f"La misión ya terminó (estado: {mission.status}) y no se puede cancelar.",
        )

    previous_status = mission.status
    mission.status = "cancelled"
    _add_event(
        db, mission.id, "mission_cancelled",
        payload={"cancelled_by": "owner", "previous_status": previous_status},
    )
    await db.commit()
    await db.refresh(mission)
    logger.info("Misión %s cancelada por el dueño", mission.id)
    return mission
