from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from uuid import UUID

from app.services.embeddings import generate_embedding
from app.core.config import settings

SIMILARITY_THRESHOLD = 0.75
TOP_K = 5


def _has_real_embeddings() -> bool:
    return bool(getattr(settings, "voyage_api_key", None))


async def _search_by_domain(
    question: str,
    business_id: UUID,
    db: AsyncSession,
    domain: str | None = None,
    role: str = "employee",  # "owner" sees all, "employee" sees only public
) -> list[dict]:
    if _has_real_embeddings():
        return await _vector_search(question, business_id, db, domain, role)
    # Without real embeddings, return all entries so the LLM can pick the relevant ones
    return await _fetch_all(business_id, db, domain, role)


async def _vector_search(
    question: str,
    business_id: UUID,
    db: AsyncSession,
    domain: str | None = None,
    role: str = "employee",
) -> list[dict]:
    embedding = generate_embedding(question)
    embedding_str = "[" + ",".join(str(x) for x in embedding) + "]"
    sensitivity_filter = "" if role == "owner" else "AND (sensitivity = 'public' OR sensitivity IS NULL)"

    if domain:
        sql = text(f"""
            SELECT id, processed_fact, category, domain,
                   1 - (embedding_vec <=> '{embedding_str}'::vector) AS similarity
            FROM knowledge_entries
            WHERE business_id = :business_id
              AND is_active = true
              AND embedding_vec IS NOT NULL
              AND domain = :domain
              {sensitivity_filter}
            ORDER BY embedding_vec <=> '{embedding_str}'::vector
            LIMIT :top_k
        """)
        result = await db.execute(sql, {
            "business_id": str(business_id),
            "domain": domain,
            "top_k": TOP_K,
        })
    else:
        sql = text(f"""
            SELECT id, processed_fact, category, domain,
                   1 - (embedding_vec <=> '{embedding_str}'::vector) AS similarity
            FROM knowledge_entries
            WHERE business_id = :business_id
              AND is_active = true
              AND embedding_vec IS NOT NULL
              {sensitivity_filter}
            ORDER BY embedding_vec <=> '{embedding_str}'::vector
            LIMIT :top_k
        """)
        result = await db.execute(sql, {
            "business_id": str(business_id),
            "top_k": TOP_K,
        })

    rows = result.fetchall()
    return [
        {
            "id": str(r.id),
            "processed_fact": r.processed_fact,
            "category": r.category,
            "domain": r.domain,
            "similarity": float(r.similarity),
        }
        for r in rows
        if float(r.similarity) >= SIMILARITY_THRESHOLD
    ]


async def _fetch_all(
    business_id: UUID,
    db: AsyncSession,
    domain: str | None = None,
    role: str = "employee",
) -> list[dict]:
    """Return active knowledge entries filtered by sensitivity.
    Employees only see 'public' entries. Owners see everything.
    """
    sensitivity_filter = "" if role == "owner" else "AND (sensitivity = 'public' OR sensitivity IS NULL)"

    if domain:
        sql = text(f"""
            SELECT id, processed_fact, category, domain, 1.0 AS similarity
            FROM knowledge_entries
            WHERE business_id = :business_id
              AND is_active = true
              AND domain = :domain
              {sensitivity_filter}
            ORDER BY created_at ASC
            LIMIT 30
        """)
        result = await db.execute(sql, {"business_id": str(business_id), "domain": domain})
        rows = result.fetchall()

        # If domain-specific search is empty, fall back to all entries
        if not rows:
            sql = text(f"""
                SELECT id, processed_fact, category, domain, 1.0 AS similarity
                FROM knowledge_entries
                WHERE business_id = :business_id
                  AND is_active = true
                  {sensitivity_filter}
                ORDER BY created_at ASC
                LIMIT 30
            """)
            result = await db.execute(sql, {"business_id": str(business_id)})
            rows = result.fetchall()
    else:
        sql = text(f"""
            SELECT id, processed_fact, category, domain, 1.0 AS similarity
            FROM knowledge_entries
            WHERE business_id = :business_id
              AND is_active = true
              {sensitivity_filter}
            ORDER BY created_at ASC
            LIMIT 30
        """)
        result = await db.execute(sql, {"business_id": str(business_id)})
        rows = result.fetchall()

    return [
        {
            "id": str(r.id),
            "processed_fact": r.processed_fact,
            "category": r.category,
            "domain": r.domain,
            "similarity": float(r.similarity),
        }
        for r in rows
    ]


async def search_ventas(question: str, business_id: UUID, db: AsyncSession, role: str = "employee") -> list[dict]:
    return await _search_by_domain(question, business_id, db, domain="ventas", role=role)


async def search_operaciones(question: str, business_id: UUID, db: AsyncSession, role: str = "employee") -> list[dict]:
    return await _search_by_domain(question, business_id, db, domain="operaciones", role=role)


async def search_clientes(question: str, business_id: UUID, db: AsyncSession, role: str = "employee") -> list[dict]:
    return await _search_by_domain(question, business_id, db, domain="clientes", role=role)


async def search_general(question: str, business_id: UUID, db: AsyncSession, role: str = "employee") -> list[dict]:
    return await _search_by_domain(question, business_id, db, domain=None, role=role)
