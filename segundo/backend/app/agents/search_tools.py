import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import bindparam, text
from uuid import UUID

from app.services.embeddings import generate_embedding, generate_embedding_cached
from app.core.config import settings

logger = logging.getLogger(__name__)

SIMILARITY_THRESHOLD = getattr(settings, "similarity_threshold", 0.75)
TOP_K = getattr(settings, "search_top_k", 5)


def _has_real_embeddings() -> bool:
    return bool(settings.voyage_api_key)


def _domain_filter_clause(domain: str | list[str] | None, params: dict) -> str:
    """Builds the SQL domain filter clause and fills the bound params.
    Accepts a single domain, a list of domains, or None (no filter).
    """
    if isinstance(domain, (list, tuple)):
        params["domains"] = list(domain)
        return "AND domain IN :domains"
    if domain:
        params["domain"] = domain
        return "AND domain = :domain"
    return ""


async def _search_by_domain(
    question: str,
    business_id: UUID,
    db: AsyncSession,
    domain: str | list[str] | None = None,
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
    domain: str | list[str] | None = None,
    role: str = "employee",
) -> list[dict]:
    embedding = generate_embedding_cached(question)
    embedding_str = "[" + ",".join(str(float(x)) for x in embedding) + "]"
    emb_lit = f"'{embedding_str}'::vector"
    # Cosine distance threshold: distance < (1 - similarity) means similarity > threshold
    max_distance = 1.0 - SIMILARITY_THRESHOLD
    sensitivity_filter = "" if role == "owner" else "AND (sensitivity = 'public' OR sensitivity IS NULL)"

    params: dict = {
        "business_id": str(business_id),
        "top_k": TOP_K,
        "max_distance": max_distance,
    }
    domain_filter = _domain_filter_clause(domain, params)

    sql = text(f"""
        SELECT id, processed_fact, category, domain,
               1 - (embedding_vec <=> {emb_lit}) AS similarity
        FROM knowledge_entries
        WHERE business_id = :business_id
          AND is_active = true
          AND embedding_vec IS NOT NULL
          {domain_filter}
          AND (embedding_vec <=> {emb_lit}) < :max_distance
          {sensitivity_filter}
        ORDER BY embedding_vec <=> {emb_lit}
        LIMIT :top_k
    """)
    if "domains" in params:
        sql = sql.bindparams(bindparam("domains", expanding=True))
    result = await db.execute(sql, params)

    rows = result.fetchall()
    entries = [
        {
            "id": str(r.id),
            "processed_fact": r.processed_fact,
            "category": r.category,
            "domain": r.domain,
            "similarity": float(r.similarity),
        }
        for r in rows
    ]
    logger.info("Vector search: domain=%s, results=%d, business=%s", domain, len(entries), business_id)
    return entries


async def _fetch_all(
    business_id: UUID,
    db: AsyncSession,
    domain: str | list[str] | None = None,
    role: str = "employee",
) -> list[dict]:
    """Return active knowledge entries filtered by sensitivity.
    Employees only see 'public' entries. Owners see everything.
    """
    sensitivity_filter = "" if role == "owner" else "AND (sensitivity = 'public' OR sensitivity IS NULL)"

    params: dict = {"business_id": str(business_id)}
    domain_filter = _domain_filter_clause(domain, params)

    sql = text(f"""
        SELECT id, processed_fact, category, domain, 1.0 AS similarity
        FROM knowledge_entries
        WHERE business_id = :business_id
          AND is_active = true
          {domain_filter}
          {sensitivity_filter}
        ORDER BY created_at ASC
        LIMIT 30
    """)
    if "domains" in params:
        sql = sql.bindparams(bindparam("domains", expanding=True))
    result = await db.execute(sql, params)
    rows = result.fetchall()

    # If domain-specific search is empty, fall back to all entries
    if domain_filter and not rows:
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


async def search_by_scopes(
    question: str,
    business_id: UUID,
    db: AsyncSession,
    scopes: list[str] | None = None,
    role: str = "employee",
) -> list[dict]:
    """Generic RAG search over one or more domain scopes.

    - scopes None/empty, or containing "general" → no domain filter.
    - single scope → same as searching that domain.
    - multiple scopes → one query filtering domain IN scopes.
    """
    clean_scopes = [s for s in (scopes or []) if s]
    if not clean_scopes or "general" in clean_scopes:
        domain: str | list[str] | None = None
    elif len(clean_scopes) == 1:
        domain = clean_scopes[0]
    else:
        domain = clean_scopes
    return await _search_by_domain(question, business_id, db, domain=domain, role=role)


async def search_ventas(question: str, business_id: UUID, db: AsyncSession, role: str = "employee") -> list[dict]:
    return await search_by_scopes(question, business_id, db, scopes=["ventas"], role=role)


async def search_operaciones(question: str, business_id: UUID, db: AsyncSession, role: str = "employee") -> list[dict]:
    return await search_by_scopes(question, business_id, db, scopes=["operaciones"], role=role)


async def search_clientes(question: str, business_id: UUID, db: AsyncSession, role: str = "employee") -> list[dict]:
    return await search_by_scopes(question, business_id, db, scopes=["clientes"], role=role)


async def search_general(question: str, business_id: UUID, db: AsyncSession, role: str = "employee") -> list[dict]:
    return await search_by_scopes(question, business_id, db, scopes=None, role=role)
