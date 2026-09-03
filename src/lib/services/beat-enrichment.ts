import { licenseRepository } from "@/lib/repositories/license.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { toPublicBeatForUi, type PublicBeatForUi } from "@/lib/serializers/beat";
import type { IBeat } from "@/types";

export interface EnrichedBeat {
  beat: PublicBeatForUi;
  startingPrice: number | null;
  licenseId: string | null;
}

export interface EnrichmentResult<T extends IBeat> {
  enriched: PublicBeatForUi[];
  priceMap: Record<string, { price: number; licenseId: string }>;
  originals: T[];
}

/**
 * Batch-fetches producers and cheapest license prices for a list of beats.
 * Returns serialized beats (via `toPublicBeatForUi`) alongside price information.
 *
 * Use this to avoid duplicating the producer-lookup + price-lookup pattern
 * across chart, marketplace, and producer services.
 */
export async function enrichBeatsWithProducersAndPrices<T extends IBeat>(
  beats: T[],
  options?: { includeProducer?: boolean; includePrice?: boolean }
): Promise<EnrichmentResult<T>> {
  const { includeProducer = true, includePrice = true } = options ?? {};

  if (beats.length === 0) {
    return { enriched: [], priceMap: {}, originals: beats };
  }

  const beatIds = beats.map((b) => b._id.toString());
  const producerIds = includeProducer
    ? [...new Set(beats.map((b) => b.producerId.toString()))]
    : [];

  const [priceMap, producers] = await Promise.all([
    includePrice
      ? licenseRepository.findCheapestForBeats(beatIds)
      : ({} as Record<string, { price: number; licenseId: string }>),
    includeProducer ? userRepository.findByIds(producerIds) : [],
  ]);

  const producerMap = new Map(
    producers.map((p) => [p._id.toString(), p])
  );

  const enriched = beats.map((beat) => {
    const producer = includeProducer
      ? producerMap.get(beat.producerId.toString())
      : undefined;
    return toPublicBeatForUi(beat, producer);
  });

  return { enriched, priceMap, originals: beats };
}
