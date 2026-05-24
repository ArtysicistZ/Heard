"""ElevenLabs voice service for Speech-to-Text and Text-to-Speech.

Provides two async functions:
- ``transcribe`` — convert audio bytes to text via Scribe v2
- ``text_to_speech_stream`` — stream TTS audio chunks via Flash v2.5
"""

from __future__ import annotations

import logging
import os
from collections.abc import AsyncIterator

import httpx

logger = logging.getLogger(__name__)

ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1"
STT_MODEL = "scribe_v2"
TTS_MODEL = "eleven_flash_v2_5"
DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"

TTS_VOICE_SETTINGS = {
    "stability": 0.65,
    "similarity_boost": 0.75,
    "style": 0.3,
    "use_speaker_boost": True,
}


def _get_api_key() -> str:
    key = os.getenv("ELEVENLABS_API_KEY", "")
    if not key:
        raise RuntimeError(
            "ELEVENLABS_API_KEY environment variable is not set. "
            "Add it to your .env file to enable voice features."
        )
    return key


def _get_voice_id() -> str:
    return os.getenv("ELEVENLABS_VOICE_ID", DEFAULT_VOICE_ID)


async def transcribe(audio_data: bytes, mime_type: str) -> str:
    """Transcribe audio bytes to text using ElevenLabs Scribe v2.

    Args:
        audio_data: Raw audio file bytes.
        mime_type: MIME type of the audio (e.g. ``audio/webm``, ``audio/wav``).

    Returns:
        Transcribed text string.

    Raises:
        RuntimeError: If the API key is missing or the API returns an error.
    """
    api_key = _get_api_key()

    ext = mime_type.split("/")[-1].split(";")[0]
    filename = f"audio.{ext}"

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{ELEVENLABS_BASE_URL}/speech-to-text",
                headers={"xi-api-key": api_key},
                files={"file": (filename, audio_data, mime_type)},
                data={
                    "model_id": STT_MODEL,
                    "language_code": "en",
                },
            )
    except httpx.TimeoutException as exc:
        raise RuntimeError("ElevenLabs STT request timed out (30s)") from exc
    except httpx.HTTPError as exc:
        raise RuntimeError(f"ElevenLabs STT network error: {exc}") from exc

    if response.status_code != 200:
        detail = response.text[:500]
        logger.error("ElevenLabs STT error %s: %s", response.status_code, detail)
        raise RuntimeError(f"ElevenLabs STT failed ({response.status_code}): {detail}")

    data = response.json()
    text = data.get("text")
    if text is None:
        raise RuntimeError("ElevenLabs STT response missing 'text' field")
    return text


async def text_to_speech_stream(text: str) -> AsyncIterator[bytes]:
    """Stream TTS audio from ElevenLabs Flash v2.5.

    Args:
        text: Text to convert to speech (max ~5000 chars recommended).

    Yields:
        Chunks of MP3 audio bytes.

    Raises:
        RuntimeError: If the API key is missing or the API returns an error.
    """
    api_key = _get_api_key()
    voice_id = _get_voice_id()

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream(
                "POST",
                f"{ELEVENLABS_BASE_URL}/text-to-speech/{voice_id}/stream",
                headers={
                    "xi-api-key": api_key,
                    "Content-Type": "application/json",
                },
                json={
                    "text": text,
                    "model_id": TTS_MODEL,
                    "voice_settings": TTS_VOICE_SETTINGS,
                },
            ) as response:
                if response.status_code != 200:
                    body = await response.aread()
                    detail = body.decode("utf-8", errors="replace")[:500]
                    logger.error("ElevenLabs TTS error %s: %s", response.status_code, detail)
                    raise RuntimeError(f"ElevenLabs TTS failed ({response.status_code}): {detail}")

                async for chunk in response.aiter_bytes(chunk_size=4096):
                    yield chunk
    except httpx.TimeoutException as exc:
        raise RuntimeError("ElevenLabs TTS request timed out (60s)") from exc
    except httpx.HTTPError as exc:
        raise RuntimeError(f"ElevenLabs TTS network error: {exc}") from exc
