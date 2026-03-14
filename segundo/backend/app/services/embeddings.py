import math
import hashlib
import httpx
from app.core.config import settings

EMBED_DIM = 1536


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


def _voyage_embed(text: str) -> list[float]:
    """Embed text using Voyage AI voyage-3 model."""
    voyage_key = getattr(settings, "voyage_api_key", None)
    if not voyage_key:
        # Try using the ANTHROPIC_API_KEY as voyage key (some setups share it)
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
