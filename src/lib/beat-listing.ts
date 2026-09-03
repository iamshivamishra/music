import type { IBeat } from "@/types";

/**
 * Crypto-free listed-status check. Import this from client-safe modules
 * instead of `beat-access`, which pulls in Node crypto.
 */
export function isListed(beat: Pick<IBeat, "status" | "isPublished">): boolean {
  return beat.status === "published" && beat.isPublished === true;
}
