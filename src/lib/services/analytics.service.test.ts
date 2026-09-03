import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/repositories/beat.repository", () => ({
  beatRepository: {
    findByIds: vi.fn(),
    findByProducerId: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/beat-event.repository", () => ({
  beatEventRepository: {
    aggregateFunnel: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/earning.repository", () => ({
  earningRepository: {
    getPaidBySource: vi.fn(),
    getPaidByBeat: vi.fn(),
    countByProducerInRange: vi.fn(),
  },
}));

import { beatRepository } from "@/lib/repositories/beat.repository";
import { beatEventRepository } from "@/lib/repositories/beat-event.repository";
import { earningRepository } from "@/lib/repositories/earning.repository";
import { analyticsService } from "./analytics.service";

describe("analyticsService.getFunnelAnalytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(beatEventRepository.aggregateFunnel).mockResolvedValue({
      byKind: [],
      bySourceAndKind: [],
      byBeatAndKind: [],
    });
    vi.mocked(earningRepository.getPaidBySource).mockResolvedValue([]);
    vi.mocked(earningRepository.getPaidByBeat).mockResolvedValue([]);
    vi.mocked(earningRepository.countByProducerInRange).mockResolvedValue(0);
    vi.mocked(beatRepository.findByIds).mockResolvedValue([]);
  });

  it("scopes aggregations to the given producer id", async () => {
    await analyticsService.getFunnelAnalytics("producer_a", 30);

    expect(beatEventRepository.aggregateFunnel).toHaveBeenCalledWith(
      "producer_a",
      expect.any(Date),
      expect.any(Date)
    );
    expect(earningRepository.getPaidBySource).toHaveBeenCalledWith(
      "producer_a",
      expect.any(Date),
      expect.any(Date)
    );
    expect(earningRepository.getPaidByBeat).toHaveBeenCalledWith(
      "producer_a",
      expect.any(Date),
      expect.any(Date)
    );
    expect(earningRepository.countByProducerInRange).toHaveBeenCalledWith(
      "producer_a",
      expect.any(Date),
      expect.any(Date)
    );
  });

  it("computes conversion as paid / pdp views and flags high-play zero sales", async () => {
    vi.mocked(beatEventRepository.aggregateFunnel).mockResolvedValue({
      byKind: [
        { kind: "play", count: 30 },
        { kind: "pdp_view", count: 10 },
        { kind: "checkout_start", count: 3 },
      ],
      bySourceAndKind: [{ source: "whatsapp", kind: "play", count: 30 }],
      byBeatAndKind: [
        { beatId: "beat_hot", kind: "play", count: 25 },
        { beatId: "beat_hot", kind: "pdp_view", count: 10 },
        { beatId: "beat_sold", kind: "play", count: 5 },
        { beatId: "beat_sold", kind: "pdp_view", count: 10 },
      ],
    });
    vi.mocked(earningRepository.getPaidByBeat).mockResolvedValue([
      { beatId: "beat_sold", paid: 2, earnings: 998 },
    ]);
    vi.mocked(earningRepository.getPaidBySource).mockResolvedValue([
      { source: "whatsapp", paid: 2, earnings: 998 },
    ]);
    vi.mocked(earningRepository.countByProducerInRange).mockResolvedValue(2);
    vi.mocked(beatRepository.findByIds).mockResolvedValue([
      { _id: "beat_hot", title: "Hot" },
      { _id: "beat_sold", title: "Sold" },
    ] as never);

    const result = await analyticsService.getFunnelAnalytics("producer_a", 7);

    expect(result.funnel).toEqual({
      plays: 30,
      pdpViews: 10,
      checkouts: 3,
      paid: 2,
    });
    expect(result.bySource).toEqual([
      { source: "whatsapp", plays: 30, paid: 2, earnings: 998 },
    ]);
    const sold = result.byBeat.find((row) => row.beatId === "beat_sold");
    expect(sold?.conversion).toBe(0.2);
    expect(result.highPlayZeroSales.map((row) => row.beatId)).toEqual(["beat_hot"]);
  });
});
