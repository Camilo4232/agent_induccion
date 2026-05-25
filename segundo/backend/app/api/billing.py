import logging
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import require_owner
from app.db.models import Business
from app.db.session import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/billing", tags=["billing"])

PLANS = {
    "changarro": {
        "name": "Changarro",
        "price_usd": 19,
        "price_cop": 79900,
        "price_brl": 99,
        "max_employees": 5,
        "features": ["1 agente general", "200 preguntas/mes", "Solo texto"],
    },
    "negocio": {
        "name": "Negocio",
        "price_usd": 49,
        "price_cop": 199900,
        "price_brl": 249,
        "max_employees": 15,
        "features": ["4 agentes", "Preguntas ilimitadas", "Voz", "Analítica"],
        "highlight": True,
    },
    "patron": {
        "name": "Patrón",
        "price_usd": 119,
        "price_cop": 479900,
        "price_brl": 599,
        "max_employees": 30,
        "features": [
            "Multi-sucursal",
            "Onboarding 1-a-1",
            "Plantillas por industria",
            "Soporte prioritario",
        ],
    },
}


class PlanResponse(BaseModel):
    plan: str
    plan_started_at: datetime | None
    plan_info: dict | None


class SubscribeRequest(BaseModel):
    plan: str = Field(..., description="changarro | negocio | patron")


@router.get("/plans")
async def list_plans():
    return {"plans": PLANS}


@router.get("/plan", response_model=PlanResponse)
async def get_my_plan(
    current_user: dict = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    business_id = UUID(current_user["business_id"])
    result = await db.execute(select(Business).where(Business.id == business_id))
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")

    return PlanResponse(
        plan=business.plan,
        plan_started_at=business.plan_started_at,
        plan_info=PLANS.get(business.plan),
    )


@router.post("/subscribe", response_model=PlanResponse)
async def subscribe(
    body: SubscribeRequest,
    current_user: dict = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    if body.plan not in PLANS:
        raise HTTPException(status_code=400, detail="Plan inválido")

    business_id = UUID(current_user["business_id"])
    result = await db.execute(select(Business).where(Business.id == business_id))
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")

    business.plan = body.plan
    business.plan_started_at = datetime.utcnow()
    await db.commit()
    await db.refresh(business)

    logger.info("Mock subscription: business=%s plan=%s", business_id, body.plan)

    return PlanResponse(
        plan=business.plan,
        plan_started_at=business.plan_started_at,
        plan_info=PLANS.get(business.plan),
    )
