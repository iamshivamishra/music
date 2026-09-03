import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/repositories/beat.repository", () => ({
  beatRepository: {
    findByProducerId: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/user.repository", () => ({
  userRepository: {
    findById: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/earning.repository", () => ({
  earningRepository: {
    sumGrossByProducer: vi.fn(),
    countByProducer: vi.fn(),
    getMonthlyRevenueRaw: vi.fn(),
    getTopBeats: vi.fn(),
    getProducerSales: vi.fn(),
  },
}));

vi.mock("@/lib/services/collab.service", () => ({
  collabService: {
    countPendingInvites: vi.fn(),
  },
}));

vi.mock("@/lib/fees", () => ({
  resolvePlatformFeePercent: vi.fn(() => 10),
}));

vi.mock("@/lib/services/beat.service", () => ({
  beatService: {
    getProducerStats: vi.fn(),
  },
}));

import { beatRepository } from "@/lib/repositories/beat.repository";
import { earningRepository } from "@/lib/repositories/earning.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { beatService } from "@/lib/services/beat.service";
import { collabService } from "@/lib/services/collab.service";
import { studioService } from "./studio.service";

describe("studioService.getAnalytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(earningRepository.sumGrossByProducer).mockResolvedValue(500);
    vi.mocked(earningRepository.countByProducer).mockResolvedValue(3);
    vi.mocked(beatService.getProducerStats).mockResolvedValue({
      total: 2,
      published: 1,
    } as never);
    vi.mocked(earningRepository.getMonthlyRevenueRaw).mockResolvedValue([]);
    vi.mocked(earningRepository.getTopBeats).mockResolvedValue([]);
    vi.mocked(beatRepository.findByProducerId).mockResolvedValue([
      { plays: 10, embedViews: 4 },
      { plays: 5, embedViews: 1 },
    ] as never);
    vi.mocked(userRepository.findById).mockResolvedValue({
      username: "owner",
      producerTier: "standard",
    } as never);
    vi.mocked(collabService.countPendingInvites).mockResolvedValue(2);
  });

  it("sums earnings from the ledger and pending collab invites", async () => {
    const result = await studioService.getAnalytics("producer_a");

    expect(earningRepository.sumGrossByProducer).toHaveBeenCalledWith("producer_a");
    expect(earningRepository.countByProducer).toHaveBeenCalledWith("producer_a");
    expect(collabService.countPendingInvites).toHaveBeenCalledWith("producer_a");
    expect(result.totalEarnings).toBe(500);
    expect(result.totalSales).toBe(3);
    expect(result.totalPlays).toBe(15);
    expect(result.totalEmbedViews).toBe(5);
    expect(result.pendingCollabInvites).toBe(2);
  });
});

describe("studioService.getSales", () => {
  it("reads sales from the earnings ledger", async () => {
    vi.mocked(earningRepository.getProducerSales).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      totalPages: 0,
    });

    await studioService.getSales("producer_a", 2, 200);

    expect(earningRepository.getProducerSales).toHaveBeenCalledWith("producer_a", 2, 50);
  });

  it("shapes collab share rows in the serializer", async () => {
    vi.mocked(earningRepository.getProducerSales).mockResolvedValue({
      data: [
        {
          purchaseId: "p1",
          beatTitle: "Night Drive",
          beatId: "b1",
          licenseType: "basic",
          amount: 999,
          shareAmount: 300,
          sharePercent: 30,
          ownerProducerId: "owner_1",
          buyerName: "Buyer",
          createdAt: new Date("2026-01-01"),
        },
      ],
      total: 1,
      page: 1,
      totalPages: 1,
    });

    const result = await studioService.getSales("collab_1", 1, 20);

    expect(result.data[0].isCollab).toBe(true);
    expect(result.data[0].shareAmount).toBe(300);
  });
});
