"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Share2,
  Download,
  Repeat,
  Repeat1,
  Shuffle,
  Volume2,
  VolumeX,
  ShoppingCart,
  Music,
  X,
} from "lucide-react";
import { useAudioPlayer } from "@/components/AudioPlayerContext";
import ShareDialog from "@/components/ShareDialog";
import { formatDuration } from "@/lib/format";

const SEEK_STEP_SECONDS = 5;

export default function BottomPlayer() {
  const {
    currentBeat,
    isPlaying,
    currentTime,
    duration,
    progress,
    volume,
    playlist,
    currentIndex,
    repeat,
    shuffle,
    canPrev,
    canNext,
    togglePlay,
    seek,
    setVolume,
    closePlayer,
    playNext,
    playPrev,
    cycleRepeat,
    toggleShuffle,
  } = useAudioPlayer();

  const [isMuted, setIsMuted] = useState(false);

  if (!currentBeat) return null;

  const hasQueue = playlist.length > 1;
  const queueLabel =
    hasQueue && currentIndex >= 0
      ? `${currentIndex + 1} of ${playlist.length}`
      : null;

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = ((e.clientX - rect.left) / rect.width) * 100;
    seek(Math.max(0, Math.min(100, percent)));
  };

  const handleSeekKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!duration) return;
    const stepPercent = (SEEK_STEP_SECONDS / duration) * 100;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      seek(Math.min(100, progress + stepPercent));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      seek(Math.max(0, progress - stepPercent));
    } else if (e.key === "Home") {
      e.preventDefault();
      seek(0);
    } else if (e.key === "End") {
      e.preventDefault();
      seek(100);
    }
  };

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/beats/${currentBeat.id}`
      : `/beats/${currentBeat.id}`;

  const repeatIcon =
    repeat === "one" ? (
      <Repeat1 className="h-4 w-4" />
    ) : (
      <Repeat className="h-4 w-4" />
    );

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-player-border bg-player-bg">
      {/* Seek bar with a11y */}
      <div
        role="slider"
        tabIndex={0}
        aria-label="Seek"
        aria-valuenow={Math.round(currentTime)}
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        className="group/seek h-1 w-full cursor-pointer bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        onClick={handleSeekClick}
        onKeyDown={handleSeekKeyDown}
      >
        <div
          className="h-full bg-gradient-to-r from-primary to-progress-end transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Mobile layout: compact single row */}
      <div className="flex items-center gap-2 px-2 py-2 sm:hidden">
        <Link
          href={`/beats/${currentBeat.id}`}
          aria-label={`Open ${currentBeat.title}`}
          className="flex min-w-0 flex-1 items-center gap-2"
        >
          {currentBeat.coverUrl ? (
            <Image
              src={currentBeat.coverUrl}
              alt={currentBeat.title}
              width={32}
              height={32}
              className="h-8 w-8 shrink-0 rounded object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-foreground/5">
              <Music className="h-3.5 w-3.5 text-foreground/30" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-foreground">
              {currentBeat.title}
            </p>
            <p className="text-[10px] text-player-muted">
              {formatDuration(currentTime)} / {formatDuration(duration)}
            </p>
          </div>
        </Link>
        {hasQueue && (
          <button
            onClick={playPrev}
            disabled={!canPrev}
            aria-label="Previous"
            className={canPrev ? "text-player-muted" : "text-player-disabled"}
          >
            <SkipBack className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-navbar-foreground text-navbar-bg"
        >
          {isPlaying ? (
            <Pause className="h-3.5 w-3.5 fill-current" />
          ) : (
            <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
          )}
        </button>
        {hasQueue && (
          <button
            onClick={playNext}
            disabled={!canNext}
            aria-label="Next"
            className={canNext ? "text-player-muted" : "text-player-disabled"}
          >
            <SkipForward className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={closePlayer}
          aria-label="Close player"
          className="text-player-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Desktop / tablet layout */}
      <div className="hidden items-center gap-4 px-4 py-3 sm:flex">
        {/* Cover + Info */}
        <Link
          href={`/beats/${currentBeat.id}`}
          aria-label={`Open ${currentBeat.title}`}
          className="flex w-56 shrink-0 items-center gap-3 hover:opacity-90"
        >
          {currentBeat.coverUrl ? (
            <Image
              src={currentBeat.coverUrl}
              alt={currentBeat.title}
              width={48}
              height={48}
              className="h-12 w-12 shrink-0 rounded-md object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-foreground/5">
              <Music className="h-5 w-5 text-foreground/30" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {currentBeat.title}
            </p>
            <p className="truncate text-xs text-player-muted">
              {currentBeat.producerName}
            </p>
          </div>
        </Link>

        {/* Share / Download — tablet+ */}
        <div className="hidden shrink-0 items-center gap-3 text-player-muted md:flex">
          <ShareDialog
            url={shareUrl}
            title={currentBeat.title}
            producerName={currentBeat.producerName}
            beatId={currentBeat.id}
            trigger={
              <button aria-label="Share" className="text-player-muted hover:text-foreground">
                <Share2 className="h-4 w-4" />
              </button>
            }
          />
          <Link
            href={`/beats/${currentBeat.id}`}
            aria-label="Download"
            className="hover:text-foreground"
          >
            <Download className="h-4 w-4" />
          </Link>
        </div>

        {/* Center controls */}
        <div className="flex flex-1 flex-col items-center gap-1">
          <div className="flex items-center gap-4">
            <button
              onClick={playPrev}
              aria-label="Previous"
              disabled={!canPrev}
              className={
                canPrev
                  ? "text-player-muted hover:text-foreground"
                  : "cursor-not-allowed text-player-disabled"
              }
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-navbar-foreground text-navbar-bg transition-transform hover:scale-105 active:scale-95"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 fill-current" />
              ) : (
                <Play className="ml-0.5 h-4 w-4 fill-current" />
              )}
            </button>
            <button
              onClick={playNext}
              aria-label="Next"
              disabled={!canNext}
              className={
                canNext
                  ? "text-player-muted hover:text-foreground"
                  : "cursor-not-allowed text-player-disabled"
              }
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs text-player-muted">
            <span className="w-10 text-right">
              {formatDuration(currentTime)}
            </span>
            <span>/</span>
            <span className="w-10">{formatDuration(duration)}</span>
          </div>
        </div>

        {/* Shuffle / Repeat / Volume / Close — desktop */}
        <div className="hidden shrink-0 items-center gap-3 lg:flex">
          {queueLabel && (
            <span className="text-xs tabular-nums text-player-muted">
              {queueLabel}
            </span>
          )}
          <button
            onClick={toggleShuffle}
            aria-label={shuffle ? "Disable shuffle" : "Enable shuffle"}
            className={
              shuffle
                ? "text-primary"
                : "text-player-muted hover:text-foreground"
            }
          >
            <Shuffle className="h-4 w-4" />
          </button>
          <button
            onClick={cycleRepeat}
            aria-label={`Repeat: ${repeat}`}
            className={
              repeat !== "off"
                ? "text-primary"
                : "text-player-muted hover:text-foreground"
            }
          >
            {repeatIcon}
          </button>
          <button
            onClick={() => {
              setVolume(isMuted ? 1 : 0);
              setIsMuted(!isMuted);
            }}
            aria-label={isMuted ? "Unmute" : "Mute"}
            className="text-player-muted hover:text-foreground"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setVolume(v);
              setIsMuted(v === 0);
            }}
            aria-label="Volume"
            className="w-24 accent-primary"
          />
          <button
            onClick={closePlayer}
            aria-label="Close player"
            className="text-player-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Buy button */}
        <Link
          href={`/beats/${currentBeat.id}`}
          aria-label="Buy"
          className="flex shrink-0 items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110"
        >
          <ShoppingCart className="h-4 w-4" />
          <span>Buy</span>
        </Link>
      </div>
    </div>
  );
}
