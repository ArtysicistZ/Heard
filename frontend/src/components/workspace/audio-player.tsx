"use client";

import { Loader2Icon, PauseIcon, PlayIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioPlayer({
  audioUrl,
  isLoading,
  onClose,
  className,
}: {
  audioUrl: string | null;
  isLoading?: boolean;
  onClose?: () => void;
  className?: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!audioUrl) {
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [audioUrl]);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => setIsPlaying(false));
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const time = Number(e.target.value);
      if (audioRef.current) {
        audioRef.current.currentTime = time;
        setCurrentTime(time);
      }
    },
    [],
  );

  if (isLoading) {
    return (
      <div
        className={cn(
          "bg-muted/50 flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
          className,
        )}
      >
        <Loader2Icon className="text-muted-foreground size-4 animate-spin" />
        <span className="text-muted-foreground">Generating audio...</span>
      </div>
    );
  }

  if (!audioUrl) return null;

  return (
    <div
      className={cn(
        "bg-muted/50 flex items-center gap-2 rounded-lg px-3 py-2",
        className,
      )}
    >
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      <Button
        size="icon-sm"
        variant="ghost"
        type="button"
        onClick={togglePlay}
      >
        {isPlaying ? (
          <PauseIcon className="size-3.5" />
        ) : (
          <PlayIcon className="size-3.5" />
        )}
      </Button>

      <span className="text-muted-foreground min-w-[3.5rem] text-xs tabular-nums">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>

      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={currentTime}
        onChange={handleSeek}
        className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-neutral-700 accent-indigo-500"
      />

      {onClose && (
        <Button
          size="icon-sm"
          variant="ghost"
          type="button"
          onClick={onClose}
        >
          <XIcon className="size-3.5" />
        </Button>
      )}
    </div>
  );
}
