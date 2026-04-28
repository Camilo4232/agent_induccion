import json
import logging
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.db.session import get_db
from app.db.models import KnowledgeEntry
from app.core.security import require_owner
from app.services.embeddings import generate_embedding

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/knowledge/templates", tags=["templates"])

TEMPLATES_DIR = Path(__file__).parent.parent / "data" / "templates"


@router.get("")
async def list_templates():
    """List available industry templates."""
    templates = []
    if TEMPLATES_DIR.exists():
        for f in sorted(TEMPLATES_DIR.glob("*.json")):
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
                templates.append({
                    "id": f.stem,
                    "name": data.get("name", f.stem),
                    "industry": data.get("industry", f.stem),
                    "facts_count": len(data.get("facts", [])),
                })
            except Exception:
                pass
    return templates


@router.post("/{template_id}/load")
async def load_template(
    template_id: str,
    current_user: dict = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    """Load a template's facts into the business knowledge base."""
    business_id = UUID(current_user["business_id"])
    user_id = UUID(current_user["sub"])

    template_file = TEMPLATES_DIR / f"{template_id}.json"
    if not template_file.exists():
        raise HTTPException(status_code=404, detail="Template not found")

    data = json.loads(template_file.read_text(encoding="utf-8"))
    facts = data.get("facts", [])

    saved = 0
    errors = 0
    for fact_data in facts[:100]:
        try:
            text = fact_data.get("text", "")
            if not text:
                continue
            embedding = generate_embedding(text)
            entry = KnowledgeEntry(
                business_id=business_id,
                raw_input=f"[Template: {data.get('name', template_id)}] {text}",
                processed_fact=text,
                category=fact_data.get("category", "otro"),
                domain=fact_data.get("domain", "general"),
                embedding=embedding,
                created_by=user_id,
            )
            db.add(entry)
            saved += 1
        except Exception as e:
            logger.warning("Template fact load error: %s", str(e))
            errors += 1

    await db.commit()
    return {"loaded": saved, "errors": errors, "template": data.get("name", template_id)}
