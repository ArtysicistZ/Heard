"""Voice API router for ElevenLabs Speech-to-Text and Text-to-Speech.

Endpoints:
- ``POST /api/voice/transcribe`` — upload audio, receive transcript
- ``POST /api/voice/tts`` — send text, receive streamed MP3 audio
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.gateway.services.elevenlabs import text_to_speech_stream, transcribe

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/voice", tags=["voice"])

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

MAX_AUDIO_SIZE = 25 * 1024 * 1024  # 25 MB


class TranscribeResponse(BaseModel):
    text: str


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000, description="Text to convert to speech")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post(
    "/transcribe",
    response_model=TranscribeResponse,
    summary="Transcribe Audio",
    description="Upload an audio file and receive its text transcription via ElevenLabs Scribe v2.",
)
async def transcribe_audio(file: UploadFile) -> TranscribeResponse:
    """Accept an audio upload and return the ElevenLabs STT transcript."""
    if not file.content_type or not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail=f"Expected audio file, got {file.content_type}")

    audio_data = await file.read()

    if len(audio_data) == 0:
        raise HTTPException(status_code=400, detail="Uploaded audio file is empty")

    if len(audio_data) > MAX_AUDIO_SIZE:
        raise HTTPException(status_code=413, detail=f"Audio file too large (max {MAX_AUDIO_SIZE // (1024 * 1024)} MB)")

    try:
        text = await transcribe(audio_data, file.content_type)
    except RuntimeError as exc:
        logger.exception("Transcription failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return TranscribeResponse(text=text)


@router.post(
    "/tts",
    summary="Text to Speech",
    description="Convert text to speech audio (MP3) via ElevenLabs Flash v2.5. Returns a streaming audio response.",
    responses={200: {"content": {"audio/mpeg": {}}}},
)
async def tts(request: TTSRequest) -> StreamingResponse:
    """Convert text to streamed MP3 audio via ElevenLabs TTS."""
    # Eagerly validate config so errors surface as HTTP 502 before streaming starts
    from app.gateway.services.elevenlabs import _get_api_key

    try:
        _get_api_key()
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return StreamingResponse(
        text_to_speech_stream(request.text),
        media_type="audio/mpeg",
        headers={"Content-Disposition": "inline"},
    )
