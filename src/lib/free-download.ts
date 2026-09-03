import type { IBeat } from "@/types";
import { isListed } from "@/lib/beat-listing";

/**
 * Crypto-free beat policy for free tagged downloads.
 * Safe to import from client UI.
 */

type PreviewFields = Pick<IBeat, "audioTaggedUrl" | "storageKeys">;
type EnableFields = PreviewFields & Pick<IBeat, "saleMode" | "exclusiveBuyerId">;
type GrantFields = EnableFields &
  Pick<IBeat, "freeDownloadEnabled" | "status" | "isPublished">;

export type FreeDownloadBlockReason = "exclusive" | "pack_only" | "no_preview";

export function hasTaggedPreview(beat: PreviewFields): boolean {
  return Boolean(beat.storageKeys?.preview || beat.audioTaggedUrl);
}

export function freeDownloadEnableBlock(
  beat: EnableFields
): FreeDownloadBlockReason | null {
  if (beat.exclusiveBuyerId) return "exclusive";
  if (beat.saleMode === "pack_only") return "pack_only";
  if (!hasTaggedPreview(beat)) return "no_preview";
  return null;
}

export function canEnableFreeDownload(beat: EnableFields): boolean {
  return freeDownloadEnableBlock(beat) === null;
}

export function canGrantFreeDownload(beat: GrantFields): boolean {
  return Boolean(beat.freeDownloadEnabled) && isListed(beat) && canEnableFreeDownload(beat);
}

export function canShowFreeDownloadCard(
  beat: GrantFields,
  hasPurchased: boolean
): boolean {
  return canGrantFreeDownload(beat) && !hasPurchased;
}
