import type { IBeat } from "@/types";

type PublicBeatPayload = Omit<IBeat, "audioFullUrl" | "stemsUrl" | "storageKeys">;

/**
 * Strips sensitive file locations from beats before API serialization.
 */
export function toPublicBeatPayload(beat: IBeat): PublicBeatPayload {
  const { audioFullUrl: _audioFullUrl, stemsUrl: _stemsUrl, storageKeys: _storageKeys, ...safeBeat } = beat;
  return JSON.parse(JSON.stringify(safeBeat)) as PublicBeatPayload;
}

/**
 * Keeps IBeat shape for UI components while removing sensitive values.
 */
export function toPublicBeatForUi(beat: IBeat): IBeat {
  const sanitized = {
    ...beat,
    audioFullUrl: "",
    stemsUrl: undefined,
    storageKeys: undefined,
  };
  return JSON.parse(JSON.stringify(sanitized)) as IBeat;
}
