"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { fetchTTSAudio, transcribeAudio } from "./api";

// ---------------------------------------------------------------------------
// useVoiceRecorder
// ---------------------------------------------------------------------------

interface UseVoiceRecorderOptions {
  /** Called when transcription completes successfully. */
  onTranscript?: (text: string) => void;
}

interface UseVoiceRecorderReturn {
  isRecording: boolean;
  isProcessing: boolean;
  error: string | null;
  startRecording: () => void;
  stopRecording: () => void;
}

const SILENCE_THRESHOLD = 10;
const SILENCE_CHECKS_FOR_STOP = 30; // 30 × 100ms = 3 seconds

export function useVoiceRecorder({
  onTranscript,
}: UseVoiceRecorderOptions = {}): UseVoiceRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceCountRef = useRef(0);
  const volumeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const cleanup = useCallback(() => {
    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current);
      volumeIntervalRef.current = null;
    }
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    analyserRef.current = null;
    void audioCtxRef.current?.close();
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    chunksRef.current = [];
    silenceCountRef.current = 0;
  }, []);

  // Cleanup on unmount
  useEffect(() => cleanup, [cleanup]);

  const processRecording = useCallback(async (blob: Blob) => {
    setIsProcessing(true);
    setError(null);
    try {
      const text = await transcribeAudio(blob);
      if (text.trim()) {
        onTranscriptRef.current?.(text.trim());
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Transcription failed";
      setError(msg);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current);
      volumeIntervalRef.current = null;
    }
  }, []);

  const startRecordingAsync = useCallback(async () => {
    cleanup();
    setError(null);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone access denied. Please allow microphone permissions.");
      return;
    }

    streamRef.current = stream;

    // Set up audio analysis for silence detection
    const audioCtx = new AudioContext();
    audioCtxRef.current = audioCtx;
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;

    // Set up MediaRecorder
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";

    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;

      if (chunksRef.current.length > 0) {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        void processRecording(blob);
      }
      chunksRef.current = [];
    };

    recorder.start(250); // collect data every 250ms
    setIsRecording(true);
    silenceCountRef.current = 0;

    // Monitor volume for auto-stop on silence
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    volumeIntervalRef.current = setInterval(() => {
      if (!analyserRef.current) return;
      analyserRef.current.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;

      if (avg < SILENCE_THRESHOLD) {
        silenceCountRef.current += 1;
        if (silenceCountRef.current >= SILENCE_CHECKS_FOR_STOP) {
          stopRecording();
        }
      } else {
        silenceCountRef.current = 0;
      }
    }, 100);
  }, [cleanup, processRecording, stopRecording]);

  const startRecording = useCallback(() => {
    void startRecordingAsync();
  }, [startRecordingAsync]);

  return { isRecording, isProcessing, error, startRecording, stopRecording };
}

// ---------------------------------------------------------------------------
// useTTS
// ---------------------------------------------------------------------------

interface UseTTSReturn {
  isLoading: boolean;
  audioUrl: string | null;
  error: string | null;
  speak: (text: string) => void;
  stop: () => void;
}

export function useTTS(): UseTTSReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  const revokeUrl = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => revokeUrl, [revokeUrl]);

  const stop = useCallback(() => {
    revokeUrl();
    setAudioUrl(null);
    setError(null);
    setIsLoading(false);
  }, [revokeUrl]);

  const speakAsync = useCallback(
    async (text: string) => {
      revokeUrl();
      setError(null);
      setIsLoading(true);
      setAudioUrl(null);

      try {
        const blob = await fetchTTSAudio(text);
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        setAudioUrl(url);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Text-to-speech failed";
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [revokeUrl],
  );

  const speak = useCallback(
    (text: string) => {
      void speakAsync(text);
    },
    [speakAsync],
  );

  return { isLoading, audioUrl, error, speak, stop };
}
