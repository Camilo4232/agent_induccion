from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.db.session import get_db
from app.db.models import UnansweredQuestion, KnowledgeEntry
from app.db.schemas import UnansweredOut, ResolveRequest, TeachResponse
from app.core.security import require_owner
from app.services.embeddings import generate_embedding

router = APIRouter(prefix="/unanswered", tags=["unanswered"])


@router.get("", response_model=list[UnansweredOut])
async def list_unanswered(
    current_user: dict = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    business_id = UUID(current_user["business_id"])
    result = await db.execute(
        select(UnansweredQuestion)
        .where(
            UnansweredQuestion.business_id == business_id,
            UnansweredQuestion.resolved == False,
        )
        .order_by(UnansweredQuestion.created_at.desc())
    )
    return result.scalars().all()


@router.post("/{unanswered_id}/resolve", response_model=TeachResponse)
async def resolve_question(
    unanswered_id: str,
    body: ResolveRequest,
    current_user: dict = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    business_id = UUID(current_user["business_id"])
    user_id = UUID(current_user["sub"])

    result = await db.execute(
        select(UnansweredQuestion).where(
            UnansweredQuestion.id == UUID(unanswered_id),
            UnansweredQuestion.business_id == business_id,
        )
    )
    uq = result.scalar_one_or_none()
    if not uq:
        raise HTTPException(status_code=404, detail="Not found")

    # Save the answer as knowledge
    embedding = generate_embedding(body.answer)
    entry = KnowledgeEntry(
        business_id=business_id,
        raw_input=f"Q: {uq.question} A: {body.answer}",
        processed_fact=body.answer,
        category="otro",
        embedding=embedding,
        created_by=user_id,
    )
    db.add(entry)

    uq.resolved = True
    await db.commit()
    await db.refresh(entry)

    return TeachResponse(
        saved=True,
        fact=body.answer,
        category="otro",
        needs_clarification=False,
        entry_id=str(entry.id),
    )
