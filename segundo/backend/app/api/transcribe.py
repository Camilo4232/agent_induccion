import os
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from app.core.security import get_current_user
import httpx

router = APIRouter()

MAX_AUDIO_BYTES = 10 * 1024 * 1024  # 10 MB

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")


@router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    if not audio.content_type or not audio.content_type.startswith(("audio/", "video/")):
        raise HTTPException(status_code=400, detail="Archivo debe ser audio")

    content = await audio.read(MAX_AUDIO_BYTES + 1)
    if len(content) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Archivo demasiado grande. Máximo 10 MB.")

    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY no configurada")

    # Use Groq's Whisper API (free tier, excellent Spanish support)
    filename = audio.filename or "recording.webm"
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            "https://api.groq.com/openai/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
            data={
                "model": "whisper-large-v3",
                "language": "es",
                "response_format": "json",
            },
            files={"file": (filename, content, audio.content_type or "audio/webm")},
        )

    if resp.status_code != 200:
        detail = resp.text[:200] if resp.text else "Error del servicio de transcripción"
        raise HTTPException(status_code=502, detail=detail)

    data = resp.json()
    return {"text": data.get("text", "").strip()}
