from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.db.session import get_db
from app.db.models import Business
from app.core.security import require_employee
from app.agents.briefing_agent import generate_daily_briefing

router = APIRouter(tags=["briefing"])


@router.post("/briefing/generate")
async def briefing_generate(
    current_user: dict = Depends(require_employee),
    db: AsyncSession = Depends(get_db),
):
    business_id = UUID(current_user["business_id"])

    result = await db.execute(select(Business).where(Business.id == business_id))
    business = result.scalar_one_or_none()
    business_name = business.name if business else "el negocio"

    briefing_text = await generate_daily_briefing(
        business_id=business_id,
        business_name=business_name,
        db=db,
    )
    return {"briefing": briefing_text}
