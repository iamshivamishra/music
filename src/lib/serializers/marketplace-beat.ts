import { toPublicBeatPayload } from "@/lib/serializers/beat";
import type { IBeat, IUser } from "@/types";

export type MarketplaceBeat = ReturnType<typeof toPublicBeatPayload> & {
  startingPrice: number | null;
  producerName: string;
  producerUsername?: string;
  producerTier?: "founding" | "standard";
};

export function toMarketplaceBeat(
  beat: IBeat,
  producer: Pick<IUser, "displayName" | "name" | "username" | "producerTier"> | undefined,
  cheapest: { price: number; licenseId: string } | undefined
): MarketplaceBeat {
  return {
    ...toPublicBeatPayload(beat),
    startingPrice: cheapest?.price ?? null,
    producerName: producer?.displayName || producer?.name || "Unknown",
    producerUsername: producer?.username || undefined,
    producerTier: producer?.producerTier,
  };
}

export function toBrowseGridItem(beat: MarketplaceBeat) {
  return {
    beat,
    startingPrice: beat.startingPrice ?? null,
  };
}
