"use client";

import { useRef, useState, useEffect } from "react";

interface AudioPlayerProps {
  audioUrl: string | null;
  previewUrl?: string;
  hasPurchased: boolean;
  songId: string;
  onBuyClick: () => void;
}

export default function AudioPlayer({
  audioUrl,
  hasPurchased,
  onBuyClick,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [previewEnded, setPreviewEnded] = useState(false);

  const PREVIEW_LIMIT = 3;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (!hasPurchased && audio.currentTime >= PREVIEW_LIMIT) {
        audio.pause();
        setIsPlaying(false);
        setPreviewEnded(true);
      }
    };

    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [hasPurchased]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (previewEnded && !hasPurchased) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio || !hasPurchased) return;
    const time = Number(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
    setPreviewEnded(false);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <>
      <div className="bg-[var(--bg3)] border border-[var(--border)] rounded-2xl p-5 flex flex-col gap-3">
        <audio ref={audioRef} src={audioUrl || undefined} preload="metadata" />

        {/* Play/Pause Button */}
        <button
          className={`w-13 h-13 rounded-full bg-[var(--primary)] text-white border-0 flex items-center justify-center self-center transition hover:scale-105 ${
            previewEnded && !hasPurchased
              ? "opacity-40 cursor-not-allowed"
              : "cursor-pointer"
          }`}
          onClick={togglePlay}
          disabled={!audioUrl}
        >
          {isPlaying ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Progress Bar */}
        <div className="w-full">
          <div className="relative h-1.5 bg-[var(--border)] rounded-full">

            {/* Progress Fill */}
            <div
              className="absolute top-0 left-0 h-full bg-[var(--primary)] rounded-full transition-all duration-100"
              style={{ width: `${progressPercent}%` }}
            />

            {/* Moving Cursor/Thumb */}
            {!previewEnded && (
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none"
                style={{ left: `${progressPercent}%` }}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-white shadow-lg transition-transform duration-100 ${
                    isPlaying ? "scale-100" : "scale-90"
                  }`}
                  style={{
                    boxShadow: isPlaying
                      ? "0 0 8px rgba(124, 92, 252, 0.9), 0 0 16px rgba(124, 92, 252, 0.4)"
                      : "0 0 4px rgba(255,255,255,0.5)",
                  }}
                />
              </div>
            )}

            {/* Preview Limit Marker */}
            {!hasPurchased && duration > 0 && (
              <div
                className="absolute -top-1 w-0.5 h-3.5 bg-yellow-500 -translate-x-1/2 rounded-full"
                style={{ left: `${(PREVIEW_LIMIT / duration) * 100}%` }}
              />
            )}

            {/* Seek Input (invisible) */}
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              disabled={!hasPurchased}
              className="absolute inset-0 w-full h-full opacity-0"
              style={{ cursor: !hasPurchased ? "not-allowed" : "pointer" }}
            />
          </div>

          {/* Time Display */}
          <div className="flex justify-between text-xs text-[var(--muted)] mt-2">
            <span>{formatTime(currentTime)}</span>
            <span>
              {hasPurchased ? formatTime(duration) : `0:${PREVIEW_LIMIT}`}
            </span>
          </div>
        </div>

        {/* Preview Ended Banner */}
        {previewEnded && !hasPurchased && (
          <div className="flex flex-col items-center gap-2.5 p-3.5 bg-[rgba(124,92,252,0.1)] border border-[rgba(124,92,252,0.3)] rounded-xl text-center">
            <span>🔒 Preview Completed</span>
            <button
              onClick={onBuyClick}
              className="px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white font-semibold hover:opacity-90 transition cursor-pointer border-0"
            >
              Buy to listen to the full song
            </button>
          </div>
        )}

        {/* Preview Note */}
        {!hasPurchased && !previewEnded && audioUrl && (
          <div className="text-center text-xs text-[var(--muted)]">
            Sirf {PREVIEW_LIMIT} sec ki preview
          </div>
        )}
      </div>
    </>
  );
}