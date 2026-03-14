import json
import re
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from uuid import UUID

from app.services.claude import complete
from app.services.embeddings import generate_embedding

logger = logging.getLogger(__name__)

CONSISTENCY_SYSTEM = """\
Eres un asistente que verifica consistencia en el manual de conocimiento de un negocio.

Te daré un hecho nuevo y una lista de hechos existentes similares.
Tu tarea es detectar si el hecho nuevo CONTRADICE directamente a alguno de los existentes.

Una contradicción existe cuando dos hechos afirman cosas incompatibles sobre el mismo tema.
Ejemplos de contradicción:
- "El descuento máximo es 10%" vs "Los clientes pueden pedir hasta 20% de descuento"
- "El proveedor llega los martes" vs "El proveedor de lácteos viene los miércoles"

NO es una contradicción si:
- Los hechos hablan de casos distintos o condiciones diferentes
- Un hecho es más específico que el otro (complementan, no contradicen)

Responde SIEMPRE en JSON válido:
{
  "contradiction": true | false,
  "conflicting_fact_index": null | 0 | 1 | 2,
  "explanation": "Explicación breve si hay contradicción, null si no"
}
"""


async def check_consistency(
    new_fact: str,
    new_fact_id: UUID,
    business_id: UUID,
    db: AsyncSession,
) -> dict:
    """
    Checks if new_fact contradicts any existing knowledge entry.
    Returns dict with keys: contradiction (bool), conflicting_fact_id (UUID|None), explanation (str|None)
    """
    embedding = generate_embedding(new_fact)
    embedding_str = "[" + ",".join(str(x) for x in embedding) + "]"

    sql = text(f"""
        SELECT id, processed_fact
        FROM knowledge_entries
        WHERE business_id = :business_id
          AND is_active = true
          AND embedding_vec IS NOT NULL
          AND id != :new_fact_id
        ORDER BY embedding_vec <=> '{embedding_str}'::vector
        LIMIT 3
    """)
    result = await db.execute(sql, {
        "business_id": str(business_id),
        "new_fact_id": str(new_fact_id),
    })
    rows = result.fetchall()

    if not rows:
        return {"contradiction": False, "conflicting_fact_id": None, "explanation": None}

    existing_facts = [{"index": i, "id": str(r.id), "fact": r.processed_fact} for i, r in enumerate(rows)]
    facts_text = "\n".join(f"{i}. {f['fact']}" for i, f in enumerate(existing_facts))

    prompt = f"Hecho nuevo: {new_fact}\n\nHechos existentes similares:\n{facts_text}"

    response_text = complete(
        system=CONSISTENCY_SYSTEM,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=256,
    )

    text_clean = response_text.strip()
    if text_clean.startswith("```"):
        lines = text_clean.split("\n")
        text_clean = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])

    try:
        data = json.loads(text_clean)
    except json.JSONDecodeError:
        match = re.search(r'\{.*\}', text_clean, re.DOTALL)
        if match:
            try:
                data = json.loads(match.group())
            except json.JSONDecodeError:
                logger.warning("check_consistency: could not parse LLM JSON, assuming no contradiction")
                return {"contradiction": False, "conflicting_fact_id": None, "explanation": None}
        else:
            logger.warning("check_consistency: no JSON found in LLM response, assuming no contradiction")
            return {"contradiction": False, "conflicting_fact_id": None, "explanation": None}

    if data.get("contradiction") and data.get("conflicting_fact_index") is not None:
        idx = data["conflicting_fact_index"]
        if 0 <= idx < len(existing_facts):
            conflicting_id = UUID(existing_facts[idx]["id"])
            return {
                "contradiction": True,
                "conflicting_fact_id": conflicting_id,
                "conflicting_fact_text": existing_facts[idx]["fact"],
                "explanation": data.get("explanation"),
            }

    return {"contradiction": False, "conflicting_fact_id": None, "explanation": None}
