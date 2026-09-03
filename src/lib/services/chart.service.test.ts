import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IBeat, IFeaturedBeat } from "@/types";

vi.mock("@/lib/repositories/beat.repository", () => ({
  beatRepository: {
    getTopChartBeats: vi.fn(),
    findRecentDrops: vi.fn(),
    findByIds: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/featured.repository", () => ({
  featuredRepository: {
    findActive: vi.fn(),
  },
}));

vi.mock("@/lib/services/beat-enrichment", () => ({
  enrichBeatsWithProducersAndPrices: vi.fn(async (beats: IBeat[]) => ({
    enriched: beats,
    priceMap: Object.fromEntries(
      beats.map((beat) => [beat._id.toString(), { price: 499, licenseId: "lic" }])
    ),
    originals: beats,
  })),
}));

import { beatRepository } from "@/lib/repositories/beat.repository";
import { featuredRepository } from "@/lib/repositories/featured.repository";
import { enrichBeatsWithProducersAndPrices } from "@/lib/services/beat-enrichment";
import { CHART_SCORE_WEIGHTS, CHART_WINDOW_DAYS } from "@/lib/chart-score";
import { chartService } from "./chart.service";

const mockedBeatRepo = vi.mocked(beatRepository);
const mockedFeaturedRepo = vi.mocked(featuredRepository);
const mockedEnrich = vi.mocked(enrichBeatsWithProducersAndPrices);

function makeBeat(id: string, overrides: Partial<IBeat> = {}): IBeat {
  return {
    _id: id,
    title: `Beat ${id}`,
    genre: "Trap",
    tags: [],
    duration: 120,
    producerId: "producer_1",
    audioTaggedUrl: "https://example.com/tagged.mp3",
    audioFullUrl: "https://example.com/master.wav",
    status: "published",
    isPublished: true,
    plays: 10,
    salesCount: 0,
    likesCount: 0,
    saleMode: "individual",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeFeatured(
  beatId: string,
  position: number,
  overrides: Partial<IFeaturedBeat> = {}
): IFeaturedBeat {
  return {
    _id: `feat_${beatId}`,
    beatId,
    position,
    section: "editor_picks",
    startDate: new Date("2026-01-01"),
    endDate: new Date("2026-12-31"),
    addedBy: "admin_1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("chartService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getWeeklyChart", () => {
    it("maps repo rows to ChartEntry with score and salesInWindow", async () => {
      const beat = makeBeat("beat_1");
      mockedBeatRepo.getTopChartBeats.mockResolvedValueOnce([
        { beat, chartScore: 43, salesInWindow: 3 },
      ]);

      const result = await chartService.getWeeklyChart(10);

      expect(mockedBeatRepo.getTopChartBeats).toHaveBeenCalledWith(
        CHART_WINDOW_DAYS,
        10,
        CHART_SCORE_WEIGHTS,
      );
      expect(result).toHaveLength(1);
      expect(result[0].beat._id).toBe("beat_1");
      expect(result[0].chartScore).toBe(43);
      expect(result[0].salesInWindow).toBe(3);
      expect(result[0].startingPrice).toBe(499);
    });

    it("joins scores by beat id when enrichment returns a different order", async () => {
      const first = makeBeat("beat_a");
      const second = makeBeat("beat_b");
      mockedBeatRepo.getTopChartBeats.mockResolvedValueOnce([
        { beat: first, chartScore: 10, salesInWindow: 1 },
        { beat: second, chartScore: 20, salesInWindow: 2 },
      ]);
      mockedEnrich.mockResolvedValueOnce({
        enriched: [second, first],
        priceMap: {
          beat_a: { price: 100, licenseId: "lic_a" },
          beat_b: { price: 200, licenseId: "lic_b" },
        },
        originals: [second, first],
      });

      const result = await chartService.getWeeklyChart(10);

      expect(result).toEqual([
        expect.objectContaining({
          beat: second,
          chartScore: 20,
          salesInWindow: 2,
          startingPrice: 200,
        }),
        expect.objectContaining({
          beat: first,
          chartScore: 10,
          salesInWindow: 1,
          startingPrice: 100,
        }),
      ]);
    });

    it("returns an empty list when the catalog has no published beats", async () => {
      mockedBeatRepo.getTopChartBeats.mockResolvedValueOnce([]);

      const result = await chartService.getWeeklyChart();

      expect(result).toEqual([]);
      expect(mockedEnrich).not.toHaveBeenCalled();
    });

    // Zero weekly sales still ranks via lifetime plays/likes
    // (CHART_SCORE_WEIGHTS: sales*10 + plays*1 + likes*3).
    it("passes through a zero-sales window score from the repository", async () => {
      const beat = makeBeat("beat_2", { plays: 20, likesCount: 4 });
      mockedBeatRepo.getTopChartBeats.mockResolvedValueOnce([
        { beat, chartScore: 32, salesInWindow: 0 },
      ]);

      const result = await chartService.getWeeklyChart(4);

      expect(result[0].salesInWindow).toBe(0);
      expect(result[0].chartScore).toBe(32);
    });
  });

  describe("getNewDrops", () => {
    it("passes through 7-day drops with prices", async () => {
      const drops = [makeBeat("drop_1"), makeBeat("drop_2")];
      mockedBeatRepo.findRecentDrops.mockResolvedValueOnce(drops);

      const result = await chartService.getNewDrops(8);

      expect(mockedBeatRepo.findRecentDrops).toHaveBeenCalledWith(CHART_WINDOW_DAYS, 8);
      expect(result).toHaveLength(2);
      expect(result.map((e) => e.beat._id)).toEqual(["drop_1", "drop_2"]);
      expect(result[0].startingPrice).toBe(499);
    });
  });

  describe("getEditorPicks", () => {
    it("skips unpublished beats and preserves featured position order", async () => {
      const publishedA = makeBeat("pub_a");
      const draftB = makeBeat("draft_b", {
        isPublished: false,
        status: "draft",
      });
      const publishedC = makeBeat("pub_c");
      mockedFeaturedRepo.findActive.mockResolvedValueOnce([
        makeFeatured("pub_a", 1),
        makeFeatured("draft_b", 2),
        makeFeatured("pub_c", 3),
      ]);
      mockedBeatRepo.findByIds.mockResolvedValueOnce([draftB, publishedC, publishedA]);

      const result = await chartService.getEditorPicks();

      expect(mockedFeaturedRepo.findActive).toHaveBeenCalledWith("editor_picks", 10);
      expect(result.map((e) => ({ id: e.beat._id, position: e.position }))).toEqual([
        { id: "pub_a", position: 1 },
        { id: "pub_c", position: 3 },
      ]);
    });

    it("returns an empty list when no editor picks are active", async () => {
      mockedFeaturedRepo.findActive.mockResolvedValueOnce([]);

      const result = await chartService.getEditorPicks();

      expect(result).toEqual([]);
      expect(mockedBeatRepo.findByIds).not.toHaveBeenCalled();
    });
  });
});
