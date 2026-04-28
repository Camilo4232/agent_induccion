import os
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from app.core.security import get_current_user
import httpx

logger = logging.getLogger(__name__)

router = APIRouter()

MAX_AUDIO_BYTES = 10 * 1024 * 1024  # 10 MB

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# Map content types to a clean MIME for Groq
_MIME_MAP = {
    "audio/webm": "audio/webm",
    "audio/ogg": "audio/ogg",
    "audio/mp4": "audio/mp4",
    "audio/mpeg": "audio/mpeg",
    "audio/wav": "audio/wav",
    "video/webm": "audio/webm",
}


def _clean_mime(raw: str | None) -> str:
    """Strip codec params and normalise to a simple MIME type."""
    if not raw:
        return "audio/webm"
    base = raw.split(";")[0].strip().lower()
    return _MIME_MAP.get(base, "audio/webm")


@router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    content = await audio.read(MAX_AUDIO_BYTES + 1)
    if len(content) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Archivo demasiado grande. Máximo 10 MB.")

    if len(content) < 100:
        raise HTTPException(status_code=400, detail="Archivo de audio vacío o demasiado corto.")

    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY no configurada")

    filename = audio.filename or "recording.webm"
    mime = _clean_mime(audio.content_type)
    logger.info("Transcribe: file=%s, content_type=%s, clean_mime=%s, size=%d",
                filename, audio.content_type, mime, len(content))

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            "https://api.groq.com/openai/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
            data={
                "model": "whisper-large-v3-turbo",
                "language": "es",
                "response_format": "json",
            },
            files={"file": (filename, content, mime)},
        )

    if resp.status_code != 200:
        detail = resp.text[:300] if resp.text else "Error del servicio de transcripción"
        logger.error("Groq transcription failed (%d): %s", resp.status_code, detail)
        raise HTTPException(status_code=502, detail=detail)

    data = resp.json()
    text = data.get("text", "").strip()
    logger.info("Transcription result: %s", text[:100] if text else "(empty)")
    return {"text": text}
