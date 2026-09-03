import { beatRepository } from "@/lib/repositories/beat.repository";
import { beatEventRepository } from "@/lib/repositories/beat-event.repository";
import { earningRepository } from "@/lib/repositories/earning.repository";
import {
  toFunnelAnalyticsDto,
  type FunnelAnalyticsDto,
} from "@/lib/serializers/analytics";
import type { FunnelDays } from "@/lib/validators/analytics";
import {
  ATTRIBUTION_SOURCES,
  type AttributionSource,
  type BeatEventKind,
} from "@/types";
import { withFeatureFlag } from "@/lib/assert-feature";

const HIGH_PLAY_ZERO_SALES_THRESHOLD = 20;

function countByKind(
  rows: { kind: BeatEventKind; count: number }[],
  kind: BeatEventKind
): number {
  let total = 0;
  for (const row of rows) {
    if (row.kind === kind) total += row.count;
  }
  return total;
}

export const analyticsService = withFeatureFlag("sourceAnalytics", {
  async getFunnelAnalytics(
    producerId: string,
    days: FunnelDays
  ): Promise<FunnelAnalyticsDto> {
    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

    const [events, paidBySource, paidByBeat, paidCount] = await Promise.all([
      beatEventRepository.aggregateFunnel(producerId, from, to),
      earningRepository.getPaidBySource(producerId, from, to),
      earningRepository.getPaidByBeat(producerId, from, to),
      earningRepository.countByProducerInRange(producerId, from, to),
    ]);

    const playsBySource = new Map<AttributionSource, number>();
    for (const row of events.bySourceAndKind) {
      if (row.kind !== "play") continue;
      playsBySource.set(row.source, (playsBySource.get(row.source) ?? 0) + row.count);
    }

    const paidBySourceMap = new Map(
      paidBySource.map((row) => [row.source as AttributionSource, row])
    );
    const sourceSet = new Set<AttributionSource>([
      ...playsBySource.keys(),
      ...paidBySourceMap.keys(),
    ]);

    const bySource = ATTRIBUTION_SOURCES.filter((source) => sourceSet.has(source)).map(
      (source) => {
        const paidRow = paidBySourceMap.get(source);
        return {
          source,
          plays: playsBySource.get(source) ?? 0,
          paid: paidRow?.paid ?? 0,
          earnings: paidRow?.earnings ?? 0,
        };
      }
    );

    const kindsByBeat = new Map<string, { play: number; pdp_view: number }>();
    for (const row of events.byBeatAndKind) {
      const current = kindsByBeat.get(row.beatId) ?? { play: 0, pdp_view: 0 };
      if (row.kind === "play") current.play += row.count;
      else if (row.kind === "pdp_view") current.pdp_view += row.count;
      kindsByBeat.set(row.beatId, current);
    }

    const paidBeatMap = new Map(paidByBeat.map((row) => [row.beatId, row]));
    const beatIds = new Set<string>([...kindsByBeat.keys(), ...paidBeatMap.keys()]);

    const beats = await beatRepository.findByIds([...beatIds]);
    const titleById = new Map(beats.map((beat) => [beat._id.toString(), beat.title]));

    const byBeat = [...beatIds].map((beatId) => {
      const kinds = kindsByBeat.get(beatId);
      const plays = kinds?.play ?? 0;
      const pdpViews = kinds?.pdp_view ?? 0;
      const paid = paidBeatMap.get(beatId)?.paid ?? 0;
      return {
        beatId,
        title: titleById.get(beatId) ?? "Unknown beat",
        plays,
        paid,
        pdpViews,
        conversion: pdpViews > 0 ? paid / pdpViews : 0,
      };
    });

    byBeat.sort((a, b) => b.plays - a.plays);

    return toFunnelAnalyticsDto({
      days,
      from,
      to,
      funnel: {
        plays: countByKind(events.byKind, "play"),
        pdpViews: countByKind(events.byKind, "pdp_view"),
        checkouts: countByKind(events.byKind, "checkout_start"),
        paid: paidCount,
      },
      bySource,
      byBeat,
      highPlayZeroSales: byBeat.filter(
        (row) => row.plays > HIGH_PLAY_ZERO_SALES_THRESHOLD && row.paid === 0
      ),
    });
  },
});
