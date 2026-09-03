"use client";

import { useRef, useState, useCallback } from "react";
import { Play, ExternalLink } from "lucide-react";
import { trackEmbedPlay } from "@/features/beats/embed-tracking";
import { EmbedChrome, EmbedPlayButton } from "@/features/beats/EmbedChrome";
import { formatEmbedPrice, type EmbedBeat, type EmbedTheme } from "@/lib/serializers/embed-types";
import { cn } from "@/lib/utils";

interface ProducerInfo {
  name: string;
  username: string;
  avatarUrl: string;
}

interface ProducerEmbedClientProps {
  producer: ProducerInfo;
  beats: EmbedBeat[];
  profileUrl: string;
  homeUrl: string;
  theme: EmbedTheme;
}

export default function ProducerEmbedClient({
  producer,
  beats,
  profileUrl,
  homeUrl,
  theme,
}: ProducerEmbedClientProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const togglePlay = useCallback(
    (beat: EmbedBeat) => {
      const audio = audioRef.current;
      if (!audio) return;

      if (playingId === beat.id) {
        audio.pause();
        setPlayingId(null);
        return;
      }

      audio.src = beat.previewUrl;
      void audio
        .play()
        .then(() => {
          setPlayingId(beat.id);
          trackEmbedPlay(beat.id);
        })
        .catch(() => setPlayingId(null));
    },
    [playingId]
  );

  return (
    <EmbedChrome theme={theme} className="overflow-hidden rounded-xl">
      <audio
        ref={audioRef}
        preload="none"
        onEnded={() => setPlayingId(null)}
      />

      <div className="flex items-center gap-3 border-b border-border p-4">
        {producer.avatarUrl ? (
          <img
            src={producer.avatarUrl}
            alt={producer.name}
            className="h-10 w-10 rounded-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold">
            {producer.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold">{producer.name}</p>
          <p className="text-xs text-muted-foreground">
            {beats.length} beat{beats.length !== 1 ? "s" : ""}
          </p>
        </div>
        <a
          href={profileUrl}
          target="_top"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          View Profile <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {beats.map((beat) => {
          const isActive = playingId === beat.id;
          return (
            <div
              key={beat.id}
              className={cn(
                "flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0 transition-colors",
                isActive ? "bg-muted/50" : "hover:bg-muted/30"
              )}
            >
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md">
                {beat.coverUrl ? (
                  <img
                    src={beat.coverUrl}
                    alt={beat.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted">
                    <Play className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>

              <EmbedPlayButton
                isPlaying={isActive}
                onClick={() => togglePlay(beat)}
                label={isActive ? `Pause ${beat.title}` : `Play ${beat.title}`}
                size="sm"
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium leading-tight">{beat.title}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {beat.genre && <span>{beat.genre}</span>}
                  {beat.bpm && <span>{beat.bpm} BPM</span>}
                </div>
              </div>

              {beat.price !== undefined && (
                <span className="shrink-0 text-sm font-medium text-primary">
                  {formatEmbedPrice(beat.price)}
                </span>
              )}

              <a
                href={beat.pdpUrl}
                target="_top"
                rel="noopener noreferrer"
                aria-label={`License ${beat.title}`}
                className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-primary"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          );
        })}

        {beats.length === 0 && (
          <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
            No beats available
          </div>
        )}
      </div>

      <div className="border-t border-border px-4 py-2 text-center">
        <a
          href={homeUrl}
          target="_top"
          rel="noopener noreferrer"
          className="text-[10px] text-muted-foreground transition-colors hover:text-foreground"
        >
          Powered by <span className="font-semibold">Trishul Beats</span>
        </a>
      </div>
    </EmbedChrome>
  );
}
