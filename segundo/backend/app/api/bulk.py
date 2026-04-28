import asyncio
import csv
import io
import json
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.db.session import get_db
from app.db.models import KnowledgeEntry
from app.core.security import require_owner
from app.services.embeddings import generate_embedding
from app.agents.extraction_agent import extract_facts_from_file

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/knowledge", tags=["bulk"])


def _try_simple_csv(text: str) -> list[dict]:
    """Try to extract facts from a CSV that has a 'text' column directly."""
    reader = csv.DictReader(io.StringIO(text))
    facts = []
    for row in reader:
        if "text" in row:
            facts.append({
                "text": row["text"],
                "category": row.get("category", "otro"),
                "domain": row.get("domain", "general"),
            })
    return facts


def _try_simple_json(text: str) -> list[dict]:
    """Try to extract facts from a JSON with a known structure."""
    data = json.loads(text)
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and "facts" in data:
        return data["facts"]
    return []


async def _extract_facts(text: str, filename: str) -> list[dict]:
    """Extract facts from file content — tries simple parsing first, then LLM agent."""
    facts = []
    if filename.endswith(".csv"):
        facts = _try_simple_csv(text)
    else:
        try:
            facts = _try_simple_json(text)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Formato de archivo no valido. Usa JSON o CSV.")

    if not facts:
        logger.info("Simple extraction found 0 facts — invoking extraction agent for %s", filename)
        try:
            loop = asyncio.get_event_loop()
            agent_facts = await loop.run_in_executor(None, extract_facts_from_file, text, filename)
            logger.info("Extraction agent returned %d facts", len(agent_facts))
            for af in agent_facts:
                facts.append({
                    "text": af.get("fact", ""),
                    "category": af.get("category", "otro"),
                    "domain": af.get("domain", "general"),
                })
        except Exception as e:
            logger.error("Extraction agent error: %s", str(e), exc_info=True)

    return facts


# ---------------------------------------------------------------------------
# Preview: extract facts without saving
# ---------------------------------------------------------------------------

@router.post("/bulk-preview")
async def bulk_preview(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_owner),
):
    """Extract and return facts for review — nothing is saved yet."""
    content = await file.read()
    text = content.decode("utf-8")
    filename = file.filename or "upload.csv"

    facts = await _extract_facts(text, filename)

    if not facts:
        raise HTTPException(status_code=400, detail="No se encontraron hechos en el archivo")

    if len(facts) > 100:
        facts = facts[:100]

    return {"facts": facts, "total": len(facts)}


# ---------------------------------------------------------------------------
# Confirm: save only the approved facts
# ---------------------------------------------------------------------------

class BulkFact(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    category: str = "otro"
    domain: str = "general"


class BulkConfirmRequest(BaseModel):
    facts: list[BulkFact] = Field(..., min_length=1, max_length=100)


@router.post("/bulk-confirm")
async def bulk_confirm(
    body: BulkConfirmRequest,
    current_user: dict = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    """Save only the facts the user approved from the preview."""
    business_id = UUID(current_user["business_id"])
    user_id = UUID(current_user["sub"])

    saved = 0
    errors = 0
    for fact_data in body.facts:
        try:
            text_val = fact_data.text.strip()
            if not text_val:
                continue
            embedding = generate_embedding(text_val)
            entry = KnowledgeEntry(
                business_id=business_id,
                raw_input=f"[Bulk upload] {text_val}",
                processed_fact=text_val,
                category=fact_data.category,
                domain=fact_data.domain,
                embedding=embedding,
                created_by=user_id,
            )
            db.add(entry)
            saved += 1
        except Exception as e:
            logger.warning("Bulk confirm fact error: %s", str(e))
            errors += 1

    await db.commit()
    return {"saved": saved, "errors": errors, "total": len(body.facts)}


# ---------------------------------------------------------------------------
# Legacy: upload and save in one step (kept for backwards compat)
# ---------------------------------------------------------------------------

@router.post("/bulk-upload")
async def bulk_upload(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    """Upload and save in one step (legacy). Prefer bulk-preview + bulk-confirm."""
    business_id = UUID(current_user["business_id"])
    user_id = UUID(current_user["sub"])

    content = await file.read()
    text = content.decode("utf-8")
    filename = file.filename or "upload.csv"

    facts = await _extract_facts(text, filename)

    if not facts:
        raise HTTPException(status_code=400, detail="No se encontraron hechos en el archivo")

    if len(facts) > 100:
        raise HTTPException(status_code=400, detail="Maximo 100 hechos por carga")

    saved = 0
    errors = 0
    for fact_data in facts:
        try:
            text_val = fact_data.get("text", "").strip()
            if not text_val:
                continue
            embedding = generate_embedding(text_val)
            entry = KnowledgeEntry(
                business_id=business_id,
                raw_input=f"[Bulk upload] {text_val}",
                processed_fact=text_val,
                category=fact_data.get("category", "otro"),
                domain=fact_data.get("domain", "general"),
                embedding=embedding,
                created_by=user_id,
            )
            db.add(entry)
            saved += 1
        except Exception as e:
            logger.warning("Bulk upload fact error: %s", str(e))
            errors += 1

    await db.commit()
    return {"saved": saved, "errors": errors, "total": len(facts)}


# ---------------------------------------------------------------------------
# Bulk text (uses memory agent, not extraction agent)
# ---------------------------------------------------------------------------

class BulkTextRequest(BaseModel):
    text: str = Field(..., min_length=10, max_length=20000)


@router.post("/bulk-text")
async def bulk_text(
    body: BulkTextRequest,
    current_user: dict = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    """Extract and save multiple facts from a long text using the memory agent."""
    business_id = UUID(current_user["business_id"])
    user_id = UUID(current_user["sub"])

    from app.agents.memory_agent import extract_facts

    facts = extract_facts(body.text)

    saved = 0
    errors = 0
    for fact_data in facts[:100]:
        try:
            fact_text = fact_data.get("fact", "").strip()
            if not fact_text:
                continue
            embedding = generate_embedding(fact_text)
            entry = KnowledgeEntry(
                business_id=business_id,
                raw_input=body.text[:500],
                processed_fact=fact_text,
                category=fact_data.get("category", "otro"),
                domain=fact_data.get("domain", "general"),
                embedding=embedding,
                created_by=user_id,
            )
            db.add(entry)
            saved += 1
        except Exception as e:
            logger.warning("Bulk text fact error: %s", str(e))
            errors += 1

    await db.commit()
    return {"saved": saved, "errors": errors, "total": len(facts)}
