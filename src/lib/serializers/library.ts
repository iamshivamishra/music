import type { IPurchase, IBeat, IUser, PaginatedResult } from "@/types";

export interface LibraryItem {
  purchaseId: string;
  beatId: string;
  beatTitle: string;
  coverUrl: string;
  genre: string;
  producerName: string;
  licenseType: string;
  includesWav: boolean;
  includesStems: boolean;
  amount: number;
  purchasedAt: string;
  isDeleted: boolean;
}

export type LibraryResult = PaginatedResult<LibraryItem>;

/**
 * Shape a page of purchases + their hydrated beats/producers into LibraryItems.
 * Reused by the library page (SSR) and the API routes.
 */
export function toLibraryItems(
  purchases: IPurchase[],
  beatMap: Map<string, IBeat>,
  producerMap: Map<string, IUser>,
  coverUrlMap: Map<string, string>
): LibraryItem[] {
  return purchases
    .filter((p) => p.beatId)
    .map((p) => {
      const beat = beatMap.get(p.beatId!.toString());
      const producer = beat
        ? producerMap.get(beat.producerId.toString())
        : null;
      const isDeleted = !beat;

      return {
        purchaseId: p._id.toString(),
        beatId: p.beatId!.toString(),
        beatTitle: beat?.title ?? "[Deleted Beat]",
        coverUrl: coverUrlMap.get(p.beatId!.toString()) ?? "",
        genre: beat?.genre ?? "",
        producerName:
          producer?.displayName || producer?.name || "Unknown Producer",
        licenseType: p.licenseType ?? "basic",
        includesWav: p.includesWav ?? false,
        includesStems: p.includesStems ?? false,
        amount: p.amount,
        purchasedAt: p.createdAt.toISOString(),
        isDeleted,
      };
    });
}
