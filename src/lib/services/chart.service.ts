import { CHART_SCORE_WEIGHTS, CHART_WINDOW_DAYS } from "@/lib/chart-score";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { featuredRepository } from "@/lib/repositories/featured.repository";
import { enrichBeatsWithProducersAndPrices } from "@/lib/services/beat-enrichment";
import type { PricedPublicBeat } from "@/lib/serializers/beat";

export type { PricedPublicBeat };

export interface ChartEntry extends PricedPublicBeat {
  chartScore: number;
  salesInWindow: number;
}

export type NewDrop = PricedPublicBeat;

export interface EditorPick extends PricedPublicBeat {
  position: number;
}

export const chartService = {
  async getWeeklyChart(limit = 10): Promise<ChartEntry[]> {
    const topBeats = await beatRepository.getTopChartBeats(
      CHART_WINDOW_DAYS,
      limit,
      CHART_SCORE_WEIGHTS,
    );

    if (topBeats.length === 0) return [];

    const { enriched, priceMap } = await enrichBeatsWithProducersAndPrices(
      topBeats.map((row) => row.beat),
    );

    const scoredById = new Map(
      topBeats.map((row) => [row.beat._id.toString(), row]),
    );

    return enriched.flatMap((beat) => {
      const original = scoredById.get(beat._id.toString());
      if (!original) return [];
      return [{
        beat,
        startingPrice: priceMap[beat._id.toString()]?.price ?? null,
        chartScore: original.chartScore,
        salesInWindow: original.salesInWindow,
      }];
    });
  },

  async getNewDrops(limit = 20): Promise<NewDrop[]> {
    const drops = await beatRepository.findRecentDrops(CHART_WINDOW_DAYS, limit);
    const { enriched, priceMap } = await enrichBeatsWithProducersAndPrices(drops);

    return enriched.map((beat) => ({
      beat,
      startingPrice: priceMap[beat._id.toString()]?.price ?? null,
    }));
  },

  async getEditorPicks(): Promise<EditorPick[]> {
    const featured = await featuredRepository.findActive("editor_picks", 10);
    if (featured.length === 0) return [];

    const beatIds = featured.map((f) => f.beatId.toString());
    const beats = await beatRepository.findByIds(beatIds);

    const publishedBeats = beats.filter((b) => b.isPublished);
    if (publishedBeats.length === 0) return [];

    const { enriched, priceMap } = await enrichBeatsWithProducersAndPrices(publishedBeats);
    const beatMap = new Map(enriched.map((b) => [b._id.toString(), b]));

    return featured.flatMap((f) => {
      const beat = beatMap.get(f.beatId.toString());
      if (!beat) return [];
      const pick: EditorPick = {
        beat,
        startingPrice: priceMap[beat._id.toString()]?.price ?? null,
        position: f.position,
      };
      return [pick];
    });
  },
};
