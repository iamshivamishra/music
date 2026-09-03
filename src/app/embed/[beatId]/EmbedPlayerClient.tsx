"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { ExternalLink, Pause, Play } from "lucide-react";
import { trackEmbedPlay, trackEmbedView } from "@/features/beats/embed-tracking";
import { EmbedChrome, EmbedPlayButton } from "@/features/beats/EmbedChrome";
import { formatEmbedPrice, type EmbedBeatDetail, type EmbedSize, type EmbedTheme } from "@/lib/serializers/embed-types";

interface EmbedPlayerClientProps {
  beat: EmbedBeatDetail;
  price?: number;
  pdpUrl: string;
  theme: EmbedTheme;
  size: EmbedSize;
}

export default function EmbedPlayerClient({
  beat,
  price,
  pdpUrl,
  theme,
  size,
}: EmbedPlayerClientProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const isCompact = size === "compact";

  useEffect(() => {
    trackEmbedView(beat.id);
  }, [beat.id]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    void audio
      .play()
      .then(() => {
        setIsPlaying(true);
        trackEmbedPlay(beat.id);
      })
      .catch(() => setIsPlaying(false));
  }, [isPlaying, beat.id]);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    setProgress((audio.currentTime / audio.duration) * 100);
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setProgress(0);
  }, []);

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const audio = audioRef.current;
      if (!audio || !audio.duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      audio.currentTime = ratio * audio.duration;
    },
    []
  );

  const audio = (
    <audio
      ref={audioRef}
      src={beat.previewUrl}
      preload="none"
      onTimeUpdate={handleTimeUpdate}
      onEnded={handleEnded}
    />
  );

  if (isCompact) {
    return (
      <EmbedChrome theme={theme} className="flex items-center gap-3 rounded-xl p-2.5">
        {audio}
        <EmbedPlayButton
          isPlaying={isPlaying}
          onClick={togglePlay}
          label={isPlaying ? "Pause" : "Play"}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">{beat.title}</p>
          <p className="truncate text-xs text-muted-foreground">{beat.producerName}</p>
        </div>
        {price !== undefined && (
          <span className="shrink-0 text-sm font-medium text-primary">
            {formatEmbedPrice(price)}
          </span>
        )}
        <a
          href={pdpUrl}
          target="_top"
          rel="noopener noreferrer"
          className="flex shrink-0 items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          License <ExternalLink className="h-3 w-3" />
        </a>
      </EmbedChrome>
    );
  }

  return (
    <EmbedChrome theme={theme} className="overflow-hidden rounded-xl">
      {audio}
      <div className="flex gap-4 p-4">
        {beat.coverUrl && (
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg">
            <img
              src={beat.coverUrl}
              alt={beat.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="absolute inset-0 flex items-center justify-center bg-[var(--overlay)] opacity-0 transition-opacity hover:opacity-100 focus:opacity-100"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                {isPlaying ? (
                  <Pause className="h-5 w-5 fill-current" />
                ) : (
                  <Play className="ml-0.5 h-5 w-5 fill-current" />
                )}
              </span>
            </button>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div>
            <h2 className="truncate text-lg font-semibold leading-tight">{beat.title}</h2>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {beat.producerName}
            </p>
            <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
              {beat.genre && (
                <span className="rounded-md bg-muted px-1.5 py-0.5">{beat.genre}</span>
              )}
              {beat.bpm && <span>{beat.bpm} BPM</span>}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3">
            {!beat.coverUrl && (
              <EmbedPlayButton
                isPlaying={isPlaying}
                onClick={togglePlay}
                label={isPlaying ? "Pause" : "Play"}
              />
            )}
            {price !== undefined && (
              <span className="text-base font-semibold text-primary">
                {formatEmbedPrice(price)}
              </span>
            )}
            <a
              href={pdpUrl}
              target="_top"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              License on Trishul Beats
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>

      <div
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        onClick={handleProgressClick}
        className="h-1 w-full cursor-pointer bg-muted"
      >
        <div
          className="h-full bg-primary transition-[width] duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>
    </EmbedChrome>
  );
}
