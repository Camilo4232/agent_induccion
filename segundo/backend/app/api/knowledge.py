import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.db.session import get_db
from app.db.models import KnowledgeEntry, KnowledgeConflict, KnowledgeVersion
from app.db.schemas import KnowledgeEntryOut, KnowledgeUpdateRequest
from app.core.security import require_owner
from app.services.embeddings import generate_embedding
from app.agents.consistency_agent import check_consistency

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/knowledge", tags=["knowledge"])


@router.get("", response_model=list[KnowledgeEntryOut])
async def list_knowledge(
    current_user: dict = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    business_id = UUID(current_user["business_id"])
    result = await db.execute(
        select(KnowledgeEntry)
        .where(
            KnowledgeEntry.business_id == business_id,
            KnowledgeEntry.is_active == True,
        )
        .order_by(KnowledgeEntry.created_at.desc())
    )
    return result.scalars().all()


@router.get("/export")
async def export_knowledge_data(
    format: str = "json",
    current_user: dict = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    """Export all active knowledge entries as JSON or CSV."""
    business_id = UUID(current_user["business_id"])
    result = await db.execute(
        select(KnowledgeEntry)
        .where(
            KnowledgeEntry.business_id == business_id,
            KnowledgeEntry.is_active == True,
        )
        .order_by(KnowledgeEntry.created_at.asc())
    )
    entries = result.scalars().all()

    data = [
        {
            "processed_fact": e.processed_fact,
            "raw_input": e.raw_input,
            "category": e.category,
            "domain": e.domain,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in entries
    ]

    if format == "csv":
        import csv
        import io
        from fastapi.responses import StreamingResponse

        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=["processed_fact", "raw_input", "category", "domain", "created_at"])
        writer.writeheader()
        writer.writerows(data)
        output.seek(0)

        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=knowledge_export.csv"},
        )

    return data


@router.patch("/{entry_id}")
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

    # Save version before editing
    if body.processed_fact is not None or body.category is not None:
        version = KnowledgeVersion(
            entry_id=entry.id,
            processed_fact=entry.processed_fact,
            category=entry.category,
            domain=entry.domain,
            changed_by=UUID(current_user["sub"]),
        )
        db.add(version)

    conflict_warning = None

    if body.processed_fact is not None and body.processed_fact != entry.processed_fact:
        entry.processed_fact = body.processed_fact
        entry.embedding = generate_embedding(body.processed_fact)

        # Re-check consistency on edit (exclude self)
        await db.flush()
        consistency = await check_consistency(
            new_fact=body.processed_fact,
            new_fact_id=entry.id,
            business_id=business_id,
            db=db,
        )
        if consistency.get("parse_failed"):
            conflict_warning = {
                "type": "consistency_check_failed",
                "message": "No se pudo verificar consistencia automáticamente.",
            }
        elif consistency["contradiction"]:
            conflict = KnowledgeConflict(
                business_id=business_id,
                fact_a_id=entry.id,
                fact_b_id=consistency["conflicting_fact_id"],
                explanation=consistency["explanation"],
            )
            db.add(conflict)
            conflict_warning = {
                "type": "contradiction_detected",
                "message": "Este hecho editado puede contradecir una regla existente.",
                "conflicting_fact": consistency.get("conflicting_fact_text"),
                "explanation": consistency["explanation"],
            }

    if body.category is not None:
        entry.category = body.category
    if body.is_active is not None:
        entry.is_active = body.is_active

    await db.commit()
    await db.refresh(entry)

    response = {
        "id": str(entry.id),
        "raw_input": entry.raw_input,
        "processed_fact": entry.processed_fact,
        "category": entry.category,
        "created_at": entry.created_at.isoformat(),
        "is_active": entry.is_active,
    }
    if conflict_warning:
        response["conflict_warning"] = conflict_warning
    return response


@router.delete("/{entry_id}")
async def delete_knowledge(
    entry_id: str,
    current_user: dict = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete: marks entry as inactive instead of removing it."""
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

    entry.is_active = False
    await db.commit()
    logger.info("Soft-deleted knowledge entry: %s", entry_id)
    return {"deleted": True}


@router.get("/{entry_id}/history")
async def entry_history(
    entry_id: str,
    current_user: dict = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    business_id = UUID(current_user["business_id"])
    entry_result = await db.execute(
        select(KnowledgeEntry).where(
            KnowledgeEntry.id == UUID(entry_id),
            KnowledgeEntry.business_id == business_id,
        )
    )
    if not entry_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Entry not found")

    result = await db.execute(
        select(KnowledgeVersion)
        .where(KnowledgeVersion.entry_id == UUID(entry_id))
        .order_by(KnowledgeVersion.created_at.desc())
    )
    versions = result.scalars().all()
    return [
        {
            "id": str(v.id),
            "processed_fact": v.processed_fact,
            "category": v.category,
            "domain": v.domain,
            "created_at": v.created_at.isoformat(),
        }
        for v in versions
    ]


@router.post("/{entry_id}/revert/{version_id}")
async def revert_entry(
    entry_id: str,
    version_id: str,
    current_user: dict = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    business_id = UUID(current_user["business_id"])
    entry_result = await db.execute(
        select(KnowledgeEntry).where(
            KnowledgeEntry.id == UUID(entry_id),
            KnowledgeEntry.business_id == business_id,
        )
    )
    entry = entry_result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    version_result = await db.execute(
        select(KnowledgeVersion).where(
            KnowledgeVersion.id == UUID(version_id),
            KnowledgeVersion.entry_id == UUID(entry_id),
        )
    )
    version = version_result.scalar_one_or_none()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    # Save current state as audit trail before reverting
    current_version = KnowledgeVersion(
        entry_id=entry.id,
        processed_fact=entry.processed_fact,
        category=entry.category,
        domain=entry.domain,
        changed_by=UUID(current_user["sub"]),
    )
    db.add(current_version)

    entry.processed_fact = version.processed_fact
    entry.category = version.category
    entry.domain = version.domain
    entry.embedding = generate_embedding(version.processed_fact)

    await db.commit()
    await db.refresh(entry)
    return {"reverted": True, "entry_id": str(entry.id)}
