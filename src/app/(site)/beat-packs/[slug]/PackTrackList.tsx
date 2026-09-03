"use client";

import { useMemo } from "react";
import Image from "next/image";
import { Play, Pause, Music } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAudioActions } from "@/components/AudioPlayerContext";
import type { PlayableBeat } from "@/features/beats/playable-beat";
import { formatDuration } from "@/lib/format";

export interface PackTrack {
  beat: PlayableBeat;
  genre?: string;
  bpm?: number;
  key?: string;
  duration?: number;
}

interface PackTrackListProps {
  tracks: PackTrack[];
  packId: string;
}

export default function PackTrackList({ tracks, packId }: PackTrackListProps) {
  const { playBeat, currentBeat, isPlaying } = useAudioActions();
  const queue = useMemo(
    () => tracks.map((track) => ({ ...track.beat, packId })),
    [tracks, packId],
  );

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold">Tracks</h2>
      <div className="space-y-2">
        {tracks.map((track, idx) => {
          const isActive = currentBeat?.id === track.beat.id;
          const isThisPlaying = isActive && isPlaying;

          return (
            <Card key={track.beat.id} className="border-border/50 bg-card/60">
              <CardContent className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
                <span className="w-6 text-center text-sm font-medium text-muted-foreground">
                  {idx + 1}
                </span>
                {track.beat.coverUrl ? (
                  <Image
                    src={track.beat.coverUrl}
                    alt=""
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                    <Music className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{track.beat.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {track.genre}
                    {track.bpm ? ` · ${track.bpm} BPM` : ""}
                    {track.key ? ` · ${track.key}` : ""}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {track.duration ? formatDuration(track.duration) : "—"}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    playBeat({ ...track.beat, packId }, { queue })
                  }
                  aria-label={
                    isThisPlaying
                      ? `Pause ${track.beat.title}`
                      : `Play ${track.beat.title}`
                  }
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:brightness-110"
                >
                  {isThisPlaying ? (
                    <Pause className="h-4 w-4 fill-current" />
                  ) : (
                    <Play className="ml-0.5 h-4 w-4 fill-current" />
                  )}
                </button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
