from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.models import Business


async def get_business_name(business_id: UUID, db: AsyncSession) -> str:
    result = await db.execute(select(Business).where(Business.id == business_id))
    business = result.scalar_one_or_none()
    return business.name if business else "tu negocio"
