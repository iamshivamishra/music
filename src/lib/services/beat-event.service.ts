import {
  attributionFromCookies,
  parseSrcParam,
  type CookieReader,
} from "@/lib/attribution";
import { beatEventRepository } from "@/lib/repositories/beat-event.repository";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { logger } from "@/lib/logger";
import { isFeatureEnabled } from "@/lib/feature-flags";
import type { AttributionSource, BeatEventKind, IOrderItem } from "@/types";

export const beatEventService = {
  async record(input: {
    beatId: string;
    kind: BeatEventKind;
    source?: string | null;
    producerId?: string;
  }): Promise<void> {
    if (!isFeatureEnabled("sourceAnalytics")) return;
    try {
      const source: AttributionSource = parseSrcParam(input.source) ?? "direct";
      const producerId =
        input.producerId ?? (await beatRepository.findProducerId(input.beatId));
      if (!producerId) return;

      await beatEventRepository.insert({
        beatId: input.beatId,
        producerId,
        kind: input.kind,
        source,
      });
    } catch (error) {
      logger.warn("BeatEvent insert failed", {
        beatId: input.beatId,
        kind: input.kind,
        error,
      });
    }
  },

  async recordPdpView(
    beatId: string,
    cookies: CookieReader,
    producerId?: string
  ): Promise<void> {
    const attribution = attributionFromCookies(cookies);
    await beatEventService.record({
      beatId,
      kind: "pdp_view",
      source: attribution.source,
      producerId,
    });
  },

  async recordEmbedView(beatId: string, producerId?: string): Promise<void> {
    await beatEventService.record({
      beatId,
      kind: "embed_view",
      source: "embed",
      producerId,
    });
  },

  recordCheckoutStarts(items: IOrderItem[], source: AttributionSource): void {
    for (const item of items) {
      if (!item.beatId) continue;
      void beatEventService.record({
        beatId: item.beatId.toString(),
        kind: "checkout_start",
        source,
      });
    }
  },
};
