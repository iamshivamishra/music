"use client";

import { useCallback } from "react";
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAudioActions, useAudioProgress } from "@/components/AudioPlayerContext";
import type { PlayableBeat } from "@/features/beats/playable-beat";
import Waveform from "@/components/Waveform";
import { formatDuration } from "@/lib/format";

interface BeatDetailPlayerProps {
  beat: PlayableBeat;
  audioSrc: string;
  previewOnly?: boolean;
}

export default function BeatDetailPlayer({
  beat,
  audioSrc,
  previewOnly = false,
}: BeatDetailPlayerProps) {
  const {
    currentBeat,
    isPlaying,
    volume,
    playlist,
    canPrev,
    canNext,
    playBeat,
    togglePlay,
    playNext,
    playPrev,
    seek,
    setVolume,
  } = useAudioActions();
  const { currentTime, duration } = useAudioProgress();

  const isThisBeat = currentBeat?.id === beat.id;
  const isThisBeatPlaying = isThisBeat && isPlaying;
  const hasQueue = isThisBeat && playlist.length > 1;

  const displayTime = isThisBeat ? currentTime : 0;
  const displayDuration = isThisBeat ? duration : 0;

  const handlePlay = useCallback(() => {
    if (isThisBeat) {
      togglePlay();
    } else {
      playBeat({ ...beat, previewUrl: audioSrc });
    }
  }, [isThisBeat, togglePlay, playBeat, beat, audioSrc]);

  const handleWaveformSeek = useCallback(
    (time: number) => {
      if (!isThisBeat) {
        playBeat({ ...beat, previewUrl: audioSrc });
        return;
      }
      if (!displayDuration) return;
      const percent = (time / displayDuration) * 100;
      seek(Math.max(0, Math.min(100, percent)));
    },
    [isThisBeat, displayDuration, seek, playBeat, beat, audioSrc],
  );

  const handleMuteToggle = useCallback(() => {
    setVolume(volume === 0 ? 1 : 0);
  }, [volume, setVolume]);

  return (
    <div className="rounded-xl border border-border/50 bg-card/50 p-4">
      {isThisBeat && (
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-primary">
          Now playing
        </p>
      )}
      <div className="mb-4">
        <Waveform
          audioUrl={audioSrc}
          progress={displayTime}
          duration={displayDuration}
          onSeek={handleWaveformSeek}
          className="h-20 w-full"
        />
      </div>

      <div className="flex items-center gap-3">
        {hasQueue && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={playPrev}
            disabled={!canPrev}
            aria-label="Previous"
          >
            <SkipBack className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-full"
          onClick={handlePlay}
          aria-label={isThisBeatPlaying ? "Pause" : "Play"}
        >
          {isThisBeatPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="ml-0.5 h-4 w-4" />
          )}
        </Button>
        {hasQueue && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={playNext}
            disabled={!canNext}
            aria-label="Next"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        )}

        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-sm font-medium">{beat.title}</p>
          <div className="flex items-center gap-2">
            <span className="w-10 text-right text-xs text-muted-foreground">
              {formatDuration(displayTime)}
            </span>
            <div className="flex-1" />
            <span className="w-10 text-xs text-muted-foreground">
              {formatDuration(displayDuration)}
            </span>
          </div>
        </div>

        <div className="hidden items-center gap-1 sm:flex">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleMuteToggle}
            aria-label={volume === 0 ? "Unmute" : "Mute"}
          >
            {volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {previewOnly && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Preview only. Purchase to unlock the full track.
        </p>
      )}
    </div>
  );
}
