"use client";

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import type { RepeatMode } from "@/lib/utils/playlist";
import {
  resolveNextTrack,
  resolvePrevTrack,
  canSkipNext,
  canSkipPrev,
} from "@/lib/utils/playlist";

// Re-export shared types so existing imports keep working.
export type { PlayableBeat, PlayBeatOptions } from "@/features/beats/playable-beat";
export type { RepeatMode } from "@/lib/utils/playlist";

import type {
  PlayableBeat,
  PlayBeatOptions,
} from "@/features/beats/playable-beat";

/* ── Play-count tracking (fire-and-forget) ── */

const playedIds = new Set<string>();

function trackPlayOnce(beatId: string) {
  if (playedIds.has(beatId)) return;
  playedIds.add(beatId);
  fetch(`/api/beats/${beatId}/plays`, { method: "POST" }).catch(() => {});
}

/* ── Media Session helpers ── */

function updateMediaSession(beat: PlayableBeat | null) {
  if (typeof navigator === "undefined" || !navigator.mediaSession) return;
  if (!beat) {
    navigator.mediaSession.metadata = null;
    return;
  }
  navigator.mediaSession.metadata = new MediaMetadata({
    title: beat.title,
    artist: beat.producerName,
    ...(beat.coverUrl
      ? { artwork: [{ src: beat.coverUrl, sizes: "512x512", type: "image/jpeg" }] }
      : {}),
  });
}

function setMediaSessionPlaying(playing: boolean) {
  if (typeof navigator === "undefined" || !navigator.mediaSession) return;
  navigator.mediaSession.playbackState = playing ? "playing" : "paused";
}

/* ── Context shapes ── */

interface AudioActionsContextType {
  currentBeat: PlayableBeat | null;
  isPlaying: boolean;
  volume: number;
  playlist: PlayableBeat[];
  currentIndex: number;
  repeat: RepeatMode;
  shuffle: boolean;
  canPrev: boolean;
  canNext: boolean;
  playBeat: (beat: PlayableBeat, options?: PlayBeatOptions) => void;
  togglePlay: () => void;
  seek: (percent: number) => void;
  setVolume: (v: number) => void;
  closePlayer: () => void;
  playNext: () => void;
  playPrev: () => void;
  setPlaylist: (beats: PlayableBeat[], startIndex?: number) => void;
  addToQueue: (beat: PlayableBeat) => void;
  cycleRepeat: () => void;
  toggleShuffle: () => void;
}

interface AudioProgressContextType {
  currentTime: number;
  duration: number;
  progress: number;
}

const AudioActionsContext = createContext<AudioActionsContextType | null>(null);
const AudioProgressContext = createContext<AudioProgressContextType | null>(null);

/* ── Provider ── */

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  /* — Playback state — */
  const [currentBeat, setCurrentBeat] = useState<PlayableBeat | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);

  /* — Playlist state — */
  const [playlist, setPlaylistState] = useState<PlayableBeat[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [shuffle, setShuffle] = useState(false);
  const [shuffleHistory, setShuffleHistory] = useState<number[]>([]);

  /* — Refs for stable closures — */
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentBeatRef = useRef(currentBeat);
  const playlistRef = useRef(playlist);
  const currentIndexRef = useRef(currentIndex);
  const repeatRef = useRef(repeat);
  const shuffleRef = useRef(shuffle);
  const shuffleHistoryRef = useRef(shuffleHistory);

  currentBeatRef.current = currentBeat;
  playlistRef.current = playlist;
  currentIndexRef.current = currentIndex;
  repeatRef.current = repeat;
  shuffleRef.current = shuffle;
  shuffleHistoryRef.current = shuffleHistory;

  /* — Internal: load + play a beat on the <audio> element — */
  const playBeatInternal = useCallback((beat: PlayableBeat) => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentBeat(beat);
    audio.src = beat.previewUrl;
    audio.currentTime = 0;
    setCurrentTime(0);
    setDuration(0);
    audio.play().catch(() => setIsPlaying(false));
    setIsPlaying(true);
    trackPlayOnce(beat.id);
    updateMediaSession(beat);
    setMediaSessionPlaying(true);
  }, []);

  /* — Skip helpers using playlist.ts pure functions — */
  const playNextStable = useCallback(() => {
    const pl = playlistRef.current;
    const idx = currentIndexRef.current;
    const rep = repeatRef.current;
    const isShuffle = shuffleRef.current;
    const history = shuffleHistoryRef.current;

    const result = resolveNextTrack({
      playlistLength: pl.length,
      currentIndex: idx,
      repeat: rep,
      shuffle: isShuffle,
      shuffleHistory: history,
    });

    if (result.action === "play") {
      setCurrentIndex(result.index);
      setShuffleHistory(result.shuffleHistory);
      playBeatInternal(pl[result.index]);
    } else {
      setIsPlaying(false);
      setMediaSessionPlaying(false);
    }
  }, [playBeatInternal]);

  const playPrevStable = useCallback((audioCurrentTime: number) => {
    const pl = playlistRef.current;
    const idx = currentIndexRef.current;
    const rep = repeatRef.current;
    const isShuffle = shuffleRef.current;
    const history = shuffleHistoryRef.current;

    const result = resolvePrevTrack({
      playlistLength: pl.length,
      currentIndex: idx,
      repeat: rep,
      shuffle: isShuffle,
      shuffleHistory: history,
      currentTime: audioCurrentTime,
    });

    if (result.action === "restart") {
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = 0;
        setCurrentTime(0);
      }
    } else if (result.action === "play") {
      setCurrentIndex(result.index);
      setShuffleHistory(result.shuffleHistory);
      playBeatInternal(pl[result.index]);
    }
  }, [playBeatInternal]);

  // Stable ref for use in audio event handlers (avoids re-subscribing).
  const playNextRef = useRef(playNextStable);
  playNextRef.current = playNextStable;

  /* — Audio element setup (runs once) — */
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => {
      if (repeatRef.current === "one") {
        audio.currentTime = 0;
        audio.play().catch(() => setIsPlaying(false));
        return;
      }
      playNextRef.current();
    };
    const onError = () => {
      setIsPlaying(false);
      setMediaSessionPlaying(false);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    // Media Session action handlers
    if (typeof navigator !== "undefined" && navigator.mediaSession) {
      navigator.mediaSession.setActionHandler("play", () => {
        audio.play().catch(() => setIsPlaying(false));
        setIsPlaying(true);
        setMediaSessionPlaying(true);
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        audio.pause();
        setIsPlaying(false);
        setMediaSessionPlaying(false);
      });
      navigator.mediaSession.setActionHandler("previoustrack", () => {
        playPrevStable(audio.currentTime);
      });
      navigator.mediaSession.setActionHandler("nexttrack", () => {
        playNextRef.current();
      });
    }

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* — Public: play a beat (toggle if same, optionally replace queue) — */
  const playBeat = useCallback(
    (beat: PlayableBeat, options?: PlayBeatOptions) => {
      const audio = audioRef.current;
      if (!audio) return;

      // Toggle play/pause when the same beat is tapped again.
      if (currentBeatRef.current?.id === beat.id) {
        if (isPlaying) {
          audio.pause();
          setIsPlaying(false);
          setMediaSessionPlaying(false);
        } else {
          audio.play().catch(() => setIsPlaying(false));
          setIsPlaying(true);
          setMediaSessionPlaying(true);
        }
        return;
      }

      // If a queue was provided, adopt it as the playlist.
      if (options?.queue && options.queue.length > 0) {
        const queue = options.queue;
        setPlaylistState(queue);
        setShuffleHistory([]);
        const idx = queue.findIndex((b) => b.id === beat.id);
        setCurrentIndex(idx >= 0 ? idx : 0);
      } else {
        // Find the beat in the existing playlist (if any).
        const idx = playlistRef.current.findIndex((b) => b.id === beat.id);
        if (idx >= 0) {
          setCurrentIndex(idx);
        } else {
          // Not in the list — set a single-item playlist.
          setPlaylistState([beat]);
          setCurrentIndex(0);
          setShuffleHistory([]);
        }
      }

      playBeatInternal(beat);
    },
    [isPlaying, playBeatInternal],
  );

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentBeatRef.current) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      setMediaSessionPlaying(false);
    } else {
      audio.play().catch(() => setIsPlaying(false));
      setIsPlaying(true);
      setMediaSessionPlaying(true);
    }
  }, [isPlaying]);

  const seek = useCallback(
    (percent: number) => {
      const audio = audioRef.current;
      if (!audio || !duration) return;
      const time = (percent / 100) * duration;
      audio.currentTime = time;
      setCurrentTime(time);
    },
    [duration],
  );

  const setVolume = useCallback((v: number) => {
    const audio = audioRef.current;
    if (audio) audio.volume = v;
    setVolumeState(v);
  }, []);

  const closePlayer = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = "";
    }
    setIsPlaying(false);
    setCurrentBeat(null);
    setCurrentTime(0);
    setDuration(0);
    setCurrentIndex(-1);
    updateMediaSession(null);
  }, []);

  const handlePlayNext = useCallback(() => {
    playNextStable();
  }, [playNextStable]);

  const handlePlayPrev = useCallback(() => {
    const audio = audioRef.current;
    playPrevStable(audio?.currentTime ?? 0);
  }, [playPrevStable]);

  const setPlaylist = useCallback(
    (beats: PlayableBeat[], startIndex?: number) => {
      setPlaylistState(beats);
      setShuffleHistory([]);
      if (startIndex !== undefined && startIndex >= 0 && startIndex < beats.length) {
        setCurrentIndex(startIndex);
        playBeatInternal(beats[startIndex]);
      } else if (currentBeatRef.current) {
        const idx = beats.findIndex((b) => b.id === currentBeatRef.current!.id);
        setCurrentIndex(idx);
      }
    },
    [playBeatInternal],
  );

  const addToQueue = useCallback((beat: PlayableBeat) => {
    setPlaylistState((prev) => {
      if (prev.some((b) => b.id === beat.id)) return prev;
      return [...prev, beat];
    });
  }, []);

  const cycleRepeat = useCallback(() => {
    setRepeat((prev) => {
      if (prev === "off") return "all";
      if (prev === "all") return "one";
      return "off";
    });
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle((prev) => !prev);
    setShuffleHistory([]);
  }, []);

  /* — Derived: can-skip flags — */
  const skipInput = {
    playlistLength: playlist.length,
    currentIndex,
    repeat,
    shuffle,
    shuffleHistory,
  };
  const canPrev = canSkipPrev(skipInput);
  const canNext = canSkipNext(skipInput);

  /* — Memoised context values — */
  const actionsValue = useMemo<AudioActionsContextType>(
    () => ({
      currentBeat,
      isPlaying,
      volume,
      playlist,
      currentIndex,
      repeat,
      shuffle,
      canPrev,
      canNext,
      playBeat,
      togglePlay,
      seek,
      setVolume,
      closePlayer,
      playNext: handlePlayNext,
      playPrev: handlePlayPrev,
      setPlaylist,
      addToQueue,
      cycleRepeat,
      toggleShuffle,
    }),
    [
      currentBeat,
      isPlaying,
      volume,
      playlist,
      currentIndex,
      repeat,
      shuffle,
      canPrev,
      canNext,
      playBeat,
      togglePlay,
      seek,
      setVolume,
      closePlayer,
      handlePlayNext,
      handlePlayPrev,
      setPlaylist,
      addToQueue,
      cycleRepeat,
      toggleShuffle,
    ],
  );

  const progress = duration ? (currentTime / duration) * 100 : 0;
  const progressValue = useMemo<AudioProgressContextType>(
    () => ({ currentTime, duration, progress }),
    [currentTime, duration, progress],
  );

  return (
    <AudioActionsContext.Provider value={actionsValue}>
      <AudioProgressContext.Provider value={progressValue}>
        {children}
      </AudioProgressContext.Provider>
    </AudioActionsContext.Provider>
  );
}

/* ── Hooks ── */

export function useAudioActions() {
  const ctx = useContext(AudioActionsContext);
  if (!ctx) throw new Error("useAudioActions must be used within AudioPlayerProvider");
  return ctx;
}

export function useAudioProgress() {
  const ctx = useContext(AudioProgressContext);
  if (!ctx) throw new Error("useAudioProgress must be used within AudioPlayerProvider");
  return ctx;
}

/** Convenience hook that merges both contexts (use in BottomPlayer). */
export function useAudioPlayer() {
  const actions = useAudioActions();
  const progress = useAudioProgress();
  return { ...actions, ...progress };
}
