from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from uuid import UUID

from app.db.session import get_db
from app.db.models import KnowledgeProposal, KnowledgeEntry, KnowledgeConflict
from app.db.schemas import ProposalOut, ConflictOut
from app.core.security import require_owner
from app.services.embeddings import generate_embedding


class ResolveConflictRequest(BaseModel):
    keep_fact_id: Optional[str] = None

router = APIRouter(tags=["proposals"])


@router.get("/proposals", response_model=list[ProposalOut])
async def list_proposals(
    current_user: dict = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    business_id = UUID(current_user["business_id"])
    result = await db.execute(
        select(KnowledgeProposal)
        .where(
            KnowledgeProposal.business_id == business_id,
            KnowledgeProposal.status == "pending",
        )
        .order_by(KnowledgeProposal.created_at.desc())
    )
    return result.scalars().all()


@router.post("/proposals/{proposal_id}/approve")
async def approve_proposal(
    proposal_id: str,
    current_user: dict = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    business_id = UUID(current_user["business_id"])
    user_id = UUID(current_user["sub"])

    result = await db.execute(
        select(KnowledgeProposal).where(
            KnowledgeProposal.id == UUID(proposal_id),
            KnowledgeProposal.business_id == business_id,
        )
    )
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    # Move to knowledge_entries
    try:
        embedding = generate_embedding(proposal.proposed_fact)
        entry = KnowledgeEntry(
            business_id=business_id,
            raw_input=proposal.proposed_fact,
            processed_fact=proposal.proposed_fact,
            category=proposal.category,
            domain=proposal.domain,
            embedding=embedding,
            created_by=user_id,
        )
        db.add(entry)
        proposal.status = "approved"
        await db.commit()
        await db.refresh(entry)
        return {"approved": True, "entry_id": str(entry.id)}
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Error al aprobar propuesta")


@router.post("/proposals/{proposal_id}/reject")
async def reject_proposal(
    proposal_id: str,
    current_user: dict = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    business_id = UUID(current_user["business_id"])
    result = await db.execute(
        select(KnowledgeProposal).where(
            KnowledgeProposal.id == UUID(proposal_id),
            KnowledgeProposal.business_id == business_id,
        )
    )
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    proposal.status = "rejected"
    await db.commit()
    return {"rejected": True}


@router.get("/knowledge/conflicts", response_model=list[ConflictOut])
async def list_conflicts(
    current_user: dict = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    business_id = UUID(current_user["business_id"])
    from sqlalchemy.orm import aliased
    FactA = aliased(KnowledgeEntry)
    FactB = aliased(KnowledgeEntry)
    result = await db.execute(
        select(
            KnowledgeConflict,
            FactA.processed_fact.label("fact_a_text"),
            FactB.processed_fact.label("fact_b_text"),
        )
        .outerjoin(FactA, KnowledgeConflict.fact_a_id == FactA.id)
        .outerjoin(FactB, KnowledgeConflict.fact_b_id == FactB.id)
        .where(
            KnowledgeConflict.business_id == business_id,
            KnowledgeConflict.resolved == False,
        )
        .order_by(KnowledgeConflict.created_at.desc())
    )
    rows = result.all()
    conflicts = []
    for conflict, fact_a_text, fact_b_text in rows:
        conflicts.append(ConflictOut(
            id=conflict.id,
            fact_a_id=conflict.fact_a_id,
            fact_b_id=conflict.fact_b_id,
            explanation=conflict.explanation,
            resolved=conflict.resolved,
            created_at=conflict.created_at,
            fact_a_text=fact_a_text,
            fact_b_text=fact_b_text,
        ))
    return conflicts


@router.post("/knowledge/conflicts/{conflict_id}/resolve")
async def resolve_conflict(
    conflict_id: str,
    body: ResolveConflictRequest = ResolveConflictRequest(),
    current_user: dict = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    business_id = UUID(current_user["business_id"])
    result = await db.execute(
        select(KnowledgeConflict).where(
            KnowledgeConflict.id == UUID(conflict_id),
            KnowledgeConflict.business_id == business_id,
        )
    )
    conflict = result.scalar_one_or_none()
    if not conflict:
        raise HTTPException(status_code=404, detail="Conflict not found")

    conflict.resolved = True

    if body.keep_fact_id:
        keep_uuid = UUID(body.keep_fact_id)
        if keep_uuid not in (conflict.fact_a_id, conflict.fact_b_id):
            raise HTTPException(status_code=400, detail="keep_fact_id must be fact_a_id or fact_b_id")
        loser_id = conflict.fact_b_id if keep_uuid == conflict.fact_a_id else conflict.fact_a_id
        if loser_id:
            loser_result = await db.execute(
                select(KnowledgeEntry).where(KnowledgeEntry.id == loser_id)
            )
            loser = loser_result.scalar_one_or_none()
            if loser:
                loser.is_active = False

    await db.commit()
    return {"resolved": True}
