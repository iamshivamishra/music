/**
 * Shared PlayableBeat type — the minimal shape every audio-playing
 * component agrees on.  Lives outside React so it can be imported by
 * pure utilities (playlist.ts) and server helpers (toPlayableBeat)
 * without pulling in client-only code.
 */
export interface PlayableBeat {
  id: string;
  title: string;
  producerName: string;
  coverUrl?: string;
  previewUrl: string;
  packId?: string;
}

export interface PlayBeatOptions {
  /** Replace the current queue with these beats when playback starts. */
  queue?: PlayableBeat[];
}

/* ── Conversion helper ── */

interface BeatLike {
  _id: { toString(): string } | string;
  title: string;
  producerName?: string | null;
  coverUrl?: string;
  audioTaggedUrl: string;
}

/** Map any Mongoose-shaped beat document into a PlayableBeat. */
export function toPlayableBeat(beat: BeatLike): PlayableBeat {
  return {
    id: typeof beat._id === "string" ? beat._id : beat._id.toString(),
    title: beat.title,
    producerName: beat.producerName ?? "",
    coverUrl: beat.coverUrl,
    previewUrl: beat.audioTaggedUrl,
  };
}
