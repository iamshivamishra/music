export type RepeatMode = "off" | "all" | "one";

export function remainingShuffleIndexes(
  playlistLength: number,
  currentIndex: number,
  shuffleHistory: number[],
): number[] {
  const played = new Set(shuffleHistory);
  played.add(currentIndex);
  const remaining: number[] = [];
  for (let i = 0; i < playlistLength; i++) {
    if (!played.has(i)) remaining.push(i);
  }
  return remaining;
}

export function pickShuffleNext(
  playlistLength: number,
  currentIndex: number,
  shuffleHistory: number[],
  random: () => number = Math.random,
): number | null {
  const remaining = remainingShuffleIndexes(
    playlistLength,
    currentIndex,
    shuffleHistory,
  );
  if (remaining.length === 0) return null;
  return remaining[Math.floor(random() * remaining.length)] ?? null;
}

export type NextTrackResult =
  | { action: "play"; index: number; shuffleHistory: number[] }
  | { action: "stop" };

export function resolveNextTrack(input: {
  playlistLength: number;
  currentIndex: number;
  repeat: RepeatMode;
  shuffle: boolean;
  shuffleHistory: number[];
  random?: () => number;
}): NextTrackResult {
  const {
    playlistLength,
    currentIndex,
    repeat,
    shuffle,
    shuffleHistory,
    random = Math.random,
  } = input;

  if (playlistLength === 0 || currentIndex < 0) {
    return { action: "stop" };
  }

  if (shuffle) {
    const next = pickShuffleNext(
      playlistLength,
      currentIndex,
      shuffleHistory,
      random,
    );
    if (next !== null) {
      return {
        action: "play",
        index: next,
        shuffleHistory: [...shuffleHistory, currentIndex],
      };
    }
    if (repeat === "all") {
      const start = Math.floor(random() * playlistLength);
      return { action: "play", index: start, shuffleHistory: [] };
    }
    return { action: "stop" };
  }

  if (currentIndex < playlistLength - 1) {
    return {
      action: "play",
      index: currentIndex + 1,
      shuffleHistory,
    };
  }
  if (repeat === "all") {
    return { action: "play", index: 0, shuffleHistory };
  }
  return { action: "stop" };
}

export type PrevTrackResult =
  | { action: "restart" }
  | { action: "play"; index: number; shuffleHistory: number[] }
  | { action: "none" };

const DEFAULT_RESTART_SECONDS = 3;

export function resolvePrevTrack(input: {
  playlistLength: number;
  currentIndex: number;
  repeat: RepeatMode;
  shuffle: boolean;
  shuffleHistory: number[];
  currentTime: number;
  restartThresholdSeconds?: number;
}): PrevTrackResult {
  const {
    playlistLength,
    currentIndex,
    repeat,
    shuffle,
    shuffleHistory,
    currentTime,
    restartThresholdSeconds = DEFAULT_RESTART_SECONDS,
  } = input;

  if (playlistLength === 0 || currentIndex < 0) {
    return { action: "none" };
  }

  if (currentTime > restartThresholdSeconds) {
    return { action: "restart" };
  }

  if (shuffle) {
    if (shuffleHistory.length > 0) {
      const prev = shuffleHistory[shuffleHistory.length - 1] ?? 0;
      return {
        action: "play",
        index: prev,
        shuffleHistory: shuffleHistory.slice(0, -1),
      };
    }
    if (repeat === "all" && playlistLength > 1) {
      const last = playlistLength - 1;
      const index = last === currentIndex ? 0 : last;
      return { action: "play", index, shuffleHistory };
    }
    return { action: "none" };
  }

  if (currentIndex > 0) {
    return {
      action: "play",
      index: currentIndex - 1,
      shuffleHistory,
    };
  }
  if (repeat === "all") {
    return {
      action: "play",
      index: playlistLength - 1,
      shuffleHistory,
    };
  }
  return { action: "none" };
}

export function canSkipNext(input: {
  playlistLength: number;
  currentIndex: number;
  repeat: RepeatMode;
  shuffle: boolean;
  shuffleHistory: number[];
}): boolean {
  const { playlistLength, currentIndex, repeat, shuffle, shuffleHistory } =
    input;
  if (playlistLength <= 1 || currentIndex < 0) return false;

  if (shuffle) {
    const remaining = remainingShuffleIndexes(
      playlistLength,
      currentIndex,
      shuffleHistory,
    );
    return remaining.length > 0 || repeat === "all";
  }

  return currentIndex < playlistLength - 1 || repeat === "all";
}

export function canSkipPrev(input: {
  playlistLength: number;
  currentIndex: number;
  repeat: RepeatMode;
  shuffle: boolean;
  shuffleHistory: number[];
}): boolean {
  const { playlistLength, currentIndex, repeat, shuffle, shuffleHistory } =
    input;
  if (playlistLength <= 1 || currentIndex < 0) return false;

  if (shuffle) {
    return shuffleHistory.length > 0 || repeat === "all";
  }

  return currentIndex > 0 || repeat === "all";
}
