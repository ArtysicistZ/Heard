import { getBackendBaseURL } from "@/core/config";

/**
 * Send an audio blob to the backend for ElevenLabs STT transcription.
 * Returns the transcribed text.
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append("file", audioBlob, "recording.webm");

  const response = await fetch(
    `${getBackendBaseURL()}/api/voice/transcribe`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Transcription failed (${response.status}): ${detail}`);
  }

  const data = (await response.json()) as { text: string };
  return data.text;
}

/**
 * Send text to the backend for ElevenLabs TTS and receive audio as a Blob.
 */
export async function fetchTTSAudio(text: string): Promise<Blob> {
  const response = await fetch(`${getBackendBaseURL()}/api/voice/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`TTS failed (${response.status}): ${detail}`);
  }

  return response.blob();
}
