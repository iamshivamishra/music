"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import Waveform from "@/components/Waveform";

interface AudioPlayerProps {
  src: string;
  title: string;
  previewOnly?: boolean;
  beatId?: string;
  showWaveform?: boolean;
}

const PREVIEW_LIMIT = 30;

function formatTime(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export default function AudioPlayer({
  src,
  title,
  previewOnly = false,
  beatId,
  showWaveform = false,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const playTracked = useRef(false);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(audio.currentTime);
    if (previewOnly && audio.currentTime >= PREVIEW_LIMIT) {
      audio.pause();
      audio.currentTime = 0;
      setIsPlaying(false);
    }
  }, [previewOnly]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      await audio.play();
      setIsPlaying(true);
      if (!playTracked.current && beatId) {
        playTracked.current = true;
        fetch(`/api/beats/${beatId}/plays`, { method: "POST" }).catch(() => {});
      }
    }
  };

  const handleSeek = (value: number | readonly number[]) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = typeof value === "number" ? value : value[0];
    if (previewOnly && time > PREVIEW_LIMIT) return;
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const handleWaveformSeek = useCallback(
    (time: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      if (previewOnly && time > PREVIEW_LIMIT) return;
      audio.currentTime = time;
      setCurrentTime(time);
    },
    [previewOnly]
  );

  const maxTime = previewOnly ? Math.min(duration, PREVIEW_LIMIT) : duration;

  return (
    <div className="rounded-xl border border-border/50 bg-card/50 p-4">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onEnded={() => setIsPlaying(false)}
        preload="metadata"
      />

      {/* Waveform */}
      {showWaveform && (
        <div className="mb-4">
          <Waveform
            audioUrl={src}
            progress={currentTime}
            duration={maxTime}
            onSeek={handleWaveformSeek}
            className="h-20 w-full"
          />
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-full"
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 ml-0.5" />
          )}
        </Button>

        <div className="flex-1 space-y-1">
          <p className="truncate text-sm font-medium">{title}</p>
          <div className="flex items-center gap-2">
            <span className="w-10 text-right text-xs text-muted-foreground">
              {formatTime(currentTime)}
            </span>
            {!showWaveform && (
              <Slider
                value={[currentTime]}
                max={maxTime || 1}
                step={0.1}
                onValueChange={handleSeek}
                className="flex-1"
                aria-label="Seek"
              />
            )}
            {showWaveform && <div className="flex-1" />}
            <span className="w-10 text-xs text-muted-foreground">
              {formatTime(maxTime)}
            </span>
          </div>
        </div>

        <div className="hidden items-center gap-1 sm:flex">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsMuted(!isMuted)}
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume]}
            max={1}
            step={0.01}
            onValueChange={(v) => {
              const val = typeof v === "number" ? v : v[0];
              setVolume(val);
              setIsMuted(false);
            }}
            className="w-20"
            aria-label="Volume"
          />
        </div>
      </div>

      {previewOnly && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Preview limited to {PREVIEW_LIMIT} seconds. Purchase to unlock full track.
        </p>
      )}
    </div>
  );
}
