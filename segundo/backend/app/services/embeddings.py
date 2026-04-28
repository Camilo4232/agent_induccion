import math
import hashlib
import logging
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

EMBED_DIM = 1536
MAX_CACHE_SIZE = 500

# In-memory LRU cache for query embeddings
_embedding_cache: dict[str, list[float]] = {}
_cache_hits = 0
_cache_misses = 0


def generate_embedding(text: str) -> list[float]:
    """
    Generate a 1536-dim embedding.
    Uses Voyage AI (voyage-3) if VOYAGE_API_KEY is set in env,
    otherwise uses a deterministic mock for local development.
    """
    try:
        return _voyage_embed(text)
    except Exception:
        return _mock_embedding(text)


def generate_embedding_cached(text: str) -> list[float]:
    """Cached version for query embeddings. Don't use for knowledge entries being stored."""
    global _cache_hits, _cache_misses
    key = hashlib.sha256(text.encode()).hexdigest()
    if key in _embedding_cache:
        _cache_hits += 1
        if (_cache_hits + _cache_misses) % 100 == 0:
            total = _cache_hits + _cache_misses
            logger.info("Embedding cache stats: hits=%d, misses=%d, rate=%.1f%%",
                       _cache_hits, _cache_misses, _cache_hits / total * 100 if total else 0)
        return _embedding_cache[key]
    _cache_misses += 1
    embedding = generate_embedding(text)
    if len(_embedding_cache) >= MAX_CACHE_SIZE:
        # Evict oldest entry
        _embedding_cache.pop(next(iter(_embedding_cache)))
    _embedding_cache[key] = embedding
    return embedding


def clear_embedding_cache():
    """Clear the embedding cache. Called when new knowledge is taught."""
    global _cache_hits, _cache_misses
    _embedding_cache.clear()
    _cache_hits = 0
    _cache_misses = 0


def _voyage_embed(text: str) -> list[float]:
    """Embed text using Voyage AI voyage-3 model."""
    voyage_key = settings.voyage_api_key
    if not voyage_key:
        raise ValueError("No VOYAGE_API_KEY configured")

    resp = httpx.post(
        "https://api.voyageai.com/v1/embeddings",
        headers={
            "Authorization": f"Bearer {voyage_key}",
            "content-type": "application/json",
        },
        json={"model": "voyage-3", "input": [text]},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["data"][0]["embedding"]


def _mock_embedding(text: str) -> list[float]:
    """
    Deterministic mock embedding for local dev.
    Uses SHA-256 hash of text, extended to EMBED_DIM dimensions.
    """
    h = hashlib.sha256(text.encode()).digest()
    base = [(b / 255.0 - 0.5) * 2 for b in h]
    result = []
    for i in range(EMBED_DIM):
        idx = i % len(base)
        result.append(base[idx] + math.sin(i * 0.1) * 0.01)
    norm = math.sqrt(sum(x * x for x in result))
    return [x / norm for x in result]
