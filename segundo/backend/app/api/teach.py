import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.db.session import get_db
from app.db.models import KnowledgeEntry, KnowledgeConflict
from app.db.schemas import TeachRequest, TeachResponse
from app.core.security import require_owner
from app.agents.memory_agent import extract_facts
from app.agents.consistency_agent import check_consistency
from app.services.embeddings import generate_embedding, clear_embedding_cache

logger = logging.getLogger(__name__)
router = APIRouter(tags=["teach"])


@router.post("/teach", response_model=list[TeachResponse])
async def teach(
    body: TeachRequest,
    current_user: dict = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    business_id = UUID(current_user["business_id"])
    user_id = UUID(current_user["sub"])

    facts = extract_facts(body.text)

    results = []
    try:
        for fact_data in facts:
            fact_text = fact_data["fact"]
            category = fact_data.get("category", "otro")
            domain = fact_data.get("domain", "general")
            needs_clarification = fact_data.get("needs_clarification", False)
            clarification_question = fact_data.get("clarification_question")

            entry_id = None
            conflict_warning = None

            if not needs_clarification:
                embedding = generate_embedding(fact_text)
                entry = KnowledgeEntry(
                    business_id=business_id,
                    raw_input=body.text,
                    processed_fact=fact_text,
                    category=category,
                    domain=domain,
                    embedding=embedding,
                    created_by=user_id,
                )
                db.add(entry)
                await db.flush()
                await db.refresh(entry)
                entry_id = str(entry.id)

                logger.info("Fact saved: business=%s, domain=%s, category=%s", business_id, domain, category)

                # Check for contradictions with existing knowledge
                consistency = await check_consistency(
                    new_fact=fact_text,
                    new_fact_id=entry.id,
                    business_id=business_id,
                    db=db,
                )

                if consistency.get("parse_failed"):
                    conflict_warning = {
                        "type": "consistency_check_failed",
                        "message": "No se pudo verificar consistencia automáticamente. Revisa manualmente.",
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
                        "message": "Este hecho puede contradecir una regla existente.",
                        "conflicting_fact": consistency.get("conflicting_fact_text"),
                        "explanation": consistency["explanation"],
                    }

            results.append(TeachResponse(
                saved=not needs_clarification,
                fact=fact_text,
                category=category,
                domain=domain,
                needs_clarification=needs_clarification,
                clarification_question=clarification_question,
                entry_id=entry_id,
                conflict_warning=conflict_warning,
            ))

        await db.commit()
        clear_embedding_cache()
    except Exception as e:
        await db.rollback()
        logger.error("Teach failed, rolled back: %s", str(e))
        raise HTTPException(status_code=500, detail="Error al guardar conocimiento")

    return results
