import { beatRepository } from "@/lib/repositories/beat.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { chartService } from "@/lib/services/chart.service";
import type { PricedPublicBeat } from "@/lib/serializers/beat";

interface HomepageStats {
  beatCount: number;
  producerCount: number;
  genreCount: number;
}

interface FoundingProducer {
  name: string;
  username: string;
  avatarUrl?: string;
  beatCount: number;
}

interface HomepageData {
  recentBeats: PricedPublicBeat[];
  trendingBeats: PricedPublicBeat[];
  stats: HomepageStats;
  foundingProducers: FoundingProducer[];
}

export const homeService = {
  async getHomepageData(): Promise<HomepageData> {
    const [chart, drops, beatCount, producerCount, genreCount, foundingRaw] =
      await Promise.all([
        chartService.getWeeklyChart(4),
        chartService.getNewDrops(8),
        beatRepository.countPublished(),
        userRepository.countByRole("producer"),
        beatRepository.countDistinctGenres(),
        userRepository.findFoundingProducers(8),
      ]);

    const trendingIds = new Set(chart.map((entry) => entry.beat._id.toString()));
    const recentBeats = drops.filter(
      (entry) => !trendingIds.has(entry.beat._id.toString()),
    );

    const countMap = await beatRepository.countByProducerIds(
      foundingRaw.map((p) => p._id.toString())
    );

    const foundingProducers: FoundingProducer[] = foundingRaw.map((p) => ({
      name: p.displayName || p.name,
      username: p.username || "",
      avatarUrl: p.avatarUrl,
      beatCount: countMap.get(p._id.toString()) ?? 0,
    }));

    return {
      recentBeats,
      trendingBeats: chart,
      stats: { beatCount, producerCount, genreCount },
      foundingProducers,
    };
  },
};
