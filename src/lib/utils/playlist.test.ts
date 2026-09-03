import { describe, expect, it } from "vitest";
import {
  canSkipNext,
  canSkipPrev,
  pickShuffleNext,
  remainingShuffleIndexes,
  resolveNextTrack,
  resolvePrevTrack,
} from "./playlist";

describe("remainingShuffleIndexes", () => {
  it("excludes the current index and history", () => {
    expect(remainingShuffleIndexes(5, 2, [0, 1])).toEqual([3, 4]);
  });

  it("returns empty when every track has been played", () => {
    expect(remainingShuffleIndexes(3, 2, [0, 1])).toEqual([]);
  });
});

describe("pickShuffleNext", () => {
  it("returns null when the queue is exhausted", () => {
    expect(pickShuffleNext(2, 1, [0])).toBeNull();
  });

  it("picks from remaining indexes using the random source", () => {
    expect(pickShuffleNext(4, 0, [], () => 0)).toBe(1);
    expect(pickShuffleNext(4, 0, [], () => 0.99)).toBe(3);
  });
});

describe("resolveNextTrack", () => {
  it("stops when there is no playlist", () => {
    expect(
      resolveNextTrack({
        playlistLength: 0,
        currentIndex: -1,
        repeat: "off",
        shuffle: false,
        shuffleHistory: [],
      }),
    ).toEqual({ action: "stop" });
  });

  it("advances to the next index", () => {
    expect(
      resolveNextTrack({
        playlistLength: 3,
        currentIndex: 0,
        repeat: "off",
        shuffle: false,
        shuffleHistory: [],
      }),
    ).toEqual({ action: "play", index: 1, shuffleHistory: [] });
  });

  it("stops at the end when repeat is off", () => {
    expect(
      resolveNextTrack({
        playlistLength: 3,
        currentIndex: 2,
        repeat: "off",
        shuffle: false,
        shuffleHistory: [],
      }),
    ).toEqual({ action: "stop" });
  });

  it("wraps to the start when repeat is all", () => {
    expect(
      resolveNextTrack({
        playlistLength: 3,
        currentIndex: 2,
        repeat: "all",
        shuffle: false,
        shuffleHistory: [],
      }),
    ).toEqual({ action: "play", index: 0, shuffleHistory: [] });
  });

  it("picks an unplayed shuffle track and records history", () => {
    expect(
      resolveNextTrack({
        playlistLength: 3,
        currentIndex: 0,
        repeat: "off",
        shuffle: true,
        shuffleHistory: [],
        random: () => 0,
      }),
    ).toEqual({ action: "play", index: 1, shuffleHistory: [0] });
  });

  it("stops when shuffle is exhausted and repeat is off", () => {
    expect(
      resolveNextTrack({
        playlistLength: 2,
        currentIndex: 1,
        repeat: "off",
        shuffle: true,
        shuffleHistory: [0],
      }),
    ).toEqual({ action: "stop" });
  });

  it("restarts shuffle when repeat is all", () => {
    expect(
      resolveNextTrack({
        playlistLength: 2,
        currentIndex: 1,
        repeat: "all",
        shuffle: true,
        shuffleHistory: [0],
        random: () => 0,
      }),
    ).toEqual({ action: "play", index: 0, shuffleHistory: [] });
  });
});

describe("resolvePrevTrack", () => {
  it("restarts the current track after the threshold", () => {
    expect(
      resolvePrevTrack({
        playlistLength: 3,
        currentIndex: 1,
        repeat: "off",
        shuffle: false,
        shuffleHistory: [],
        currentTime: 4,
      }),
    ).toEqual({ action: "restart" });
  });

  it("goes to the previous index", () => {
    expect(
      resolvePrevTrack({
        playlistLength: 3,
        currentIndex: 2,
        repeat: "off",
        shuffle: false,
        shuffleHistory: [],
        currentTime: 1,
      }),
    ).toEqual({ action: "play", index: 1, shuffleHistory: [] });
  });

  it("wraps to the last track when repeat is all", () => {
    expect(
      resolvePrevTrack({
        playlistLength: 3,
        currentIndex: 0,
        repeat: "all",
        shuffle: false,
        shuffleHistory: [],
        currentTime: 0,
      }),
    ).toEqual({ action: "play", index: 2, shuffleHistory: [] });
  });

  it("does nothing at the start when repeat is off", () => {
    expect(
      resolvePrevTrack({
        playlistLength: 3,
        currentIndex: 0,
        repeat: "off",
        shuffle: false,
        shuffleHistory: [],
        currentTime: 0,
      }),
    ).toEqual({ action: "none" });
  });

  it("pops shuffle history", () => {
    expect(
      resolvePrevTrack({
        playlistLength: 4,
        currentIndex: 2,
        repeat: "off",
        shuffle: true,
        shuffleHistory: [0, 1],
        currentTime: 0,
      }),
    ).toEqual({ action: "play", index: 1, shuffleHistory: [0] });
  });
});

describe("canSkipNext / canSkipPrev", () => {
  const base = {
    playlistLength: 3,
    currentIndex: 1,
    repeat: "off" as const,
    shuffle: false,
    shuffleHistory: [] as number[],
  };

  it("allows next and prev in the middle of a linear queue", () => {
    expect(canSkipNext(base)).toBe(true);
    expect(canSkipPrev(base)).toBe(true);
  });

  it("disables next at the end unless repeat is all", () => {
    expect(canSkipNext({ ...base, currentIndex: 2 })).toBe(false);
    expect(canSkipNext({ ...base, currentIndex: 2, repeat: "all" })).toBe(true);
  });

  it("disables prev at the start unless repeat is all", () => {
    expect(canSkipPrev({ ...base, currentIndex: 0 })).toBe(false);
    expect(canSkipPrev({ ...base, currentIndex: 0, repeat: "all" })).toBe(true);
  });

  it("uses remaining shuffle tracks for next", () => {
    expect(
      canSkipNext({
        playlistLength: 3,
        currentIndex: 2,
        repeat: "off",
        shuffle: true,
        shuffleHistory: [0],
      }),
    ).toBe(true);
    expect(
      canSkipNext({
        playlistLength: 3,
        currentIndex: 2,
        repeat: "off",
        shuffle: true,
        shuffleHistory: [0, 1],
      }),
    ).toBe(false);
  });

  it("allows shuffle prev when history exists", () => {
    expect(
      canSkipPrev({
        playlistLength: 3,
        currentIndex: 2,
        repeat: "off",
        shuffle: true,
        shuffleHistory: [],
      }),
    ).toBe(false);
    expect(
      canSkipPrev({
        playlistLength: 3,
        currentIndex: 2,
        repeat: "off",
        shuffle: true,
        shuffleHistory: [0],
      }),
    ).toBe(true);
  });

  it("returns false for a single-track playlist", () => {
    const single = {
      playlistLength: 1,
      currentIndex: 0,
      repeat: "all" as const,
      shuffle: false,
      shuffleHistory: [] as number[],
    };
    expect(canSkipNext(single)).toBe(false);
    expect(canSkipPrev(single)).toBe(false);
  });
});
