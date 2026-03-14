from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.db.session import get_db
from app.db.models import KnowledgeEntry
from app.db.schemas import KnowledgeEntryOut, KnowledgeUpdateRequest
from app.core.security import require_owner
from app.services.embeddings import generate_embedding

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


@router.get("", response_model=list[KnowledgeEntryOut])
async def list_knowledge(
    current_user: dict = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    business_id = UUID(current_user["business_id"])
    result = await db.execute(
        select(KnowledgeEntry)
        .where(KnowledgeEntry.business_id == business_id)
        .order_by(KnowledgeEntry.created_at.desc())
    )
    return result.scalars().all()


@router.patch("/{entry_id}", response_model=KnowledgeEntryOut)
async def update_knowledge(
    entry_id: str,
    body: KnowledgeUpdateRequest,
    current_user: dict = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    business_id = UUID(current_user["business_id"])
    result = await db.execute(
        select(KnowledgeEntry).where(
            KnowledgeEntry.id == UUID(entry_id),
            KnowledgeEntry.business_id == business_id,
        )
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    if body.processed_fact is not None:
        entry.processed_fact = body.processed_fact
        # Re-embed on fact change
        entry.embedding = generate_embedding(body.processed_fact)
    if body.category is not None:
        entry.category = body.category
    if body.is_active is not None:
        entry.is_active = body.is_active

    await db.commit()
    await db.refresh(entry)
    return entry


@router.delete("/{entry_id}")
async def delete_knowledge(
    entry_id: str,
    current_user: dict = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    business_id = UUID(current_user["business_id"])
    result = await db.execute(
        select(KnowledgeEntry).where(
            KnowledgeEntry.id == UUID(entry_id),
            KnowledgeEntry.business_id == business_id,
        )
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    await db.delete(entry)
    await db.commit()
    return {"deleted": True}
