import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/repositories/purchase.repository", () => ({
  purchaseRepository: {
    findByBuyerIdPaginated: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/beat.repository", () => ({
  beatRepository: {
    findByIds: vi.fn(),
    findIdsByTitle: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/user.repository", () => ({
  userRepository: {
    findByIds: vi.fn(),
  },
}));

vi.mock("@/lib/services/storage.service", () => ({
  storageService: {
    presignCoverUrl: vi.fn(async (url: string) => `signed:${url}`),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn() },
}));

import { beatRepository } from "@/lib/repositories/beat.repository";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { libraryService } from "./library.service";

const purchasedAt = new Date("2025-12-15T00:00:00.000Z");

function paginated<T>(data: T[], total = data.length, page = 1, limit = 20) {
  const totalPages = Math.ceil(total / limit);
  return {
    data,
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

describe("libraryService.getLibrary", () => {
  beforeEach(() => {
    vi.mocked(purchaseRepository.findByBuyerIdPaginated).mockReset();
    vi.mocked(beatRepository.findByIds).mockReset();
    vi.mocked(beatRepository.findIdsByTitle).mockReset();
    vi.mocked(userRepository.findByIds).mockReset();
    vi.mocked(userRepository.findByIds).mockResolvedValue([]);
    vi.mocked(beatRepository.findByIds).mockResolvedValue([]);
    vi.mocked(beatRepository.findIdsByTitle).mockResolvedValue([]);
  });

  it("passes pagination totals from the purchase query", async () => {
    vi.mocked(purchaseRepository.findByBuyerIdPaginated).mockResolvedValueOnce(
      paginated([], 40, 2, 20)
    );

    const result = await libraryService.getLibrary("buyer_1", 2, 20);

    expect(purchaseRepository.findByBuyerIdPaginated).toHaveBeenCalledWith("buyer_1", {
      page: 2,
      limit: 20,
      type: "beat",
      beatIds: undefined,
    });
    expect(beatRepository.findIdsByTitle).not.toHaveBeenCalled();
    expect(result.total).toBe(40);
    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(2);
    expect(result.hasNext).toBe(false);
    expect(result.hasPrev).toBe(true);
  });

  it("returns an empty page when title search matches no beats", async () => {
    vi.mocked(beatRepository.findIdsByTitle).mockResolvedValueOnce([]);

    const result = await libraryService.getLibrary("buyer_1", 1, 20, "trap");

    expect(purchaseRepository.findByBuyerIdPaginated).not.toHaveBeenCalled();
    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
  });

  it("filters purchases by matching beat ids instead of the current page", async () => {
    vi.mocked(beatRepository.findIdsByTitle).mockResolvedValue(["beat_9"]);
    vi.mocked(purchaseRepository.findByBuyerIdPaginated).mockResolvedValue(
      paginated(
        [
          {
            _id: "purchase_9",
            beatId: "beat_9",
            licenseType: "premium",
            includesWav: true,
            includesStems: false,
            amount: 1499,
            createdAt: purchasedAt,
          },
        ],
        1,
        1,
        20
      ) as never
    );
    vi.mocked(beatRepository.findByIds).mockResolvedValue([
      {
        _id: "beat_9",
        title: "Night Trap",
        coverUrl: "covers/trap.png",
        genre: "Trap",
        producerId: "producer_1",
      },
    ] as never);
    vi.mocked(userRepository.findByIds).mockResolvedValueOnce([
      { _id: "producer_1", displayName: "Rao", name: "Rao" },
    ] as never);

    const result = await libraryService.getLibrary("buyer_1", 1, 20, "trap");

    expect(purchaseRepository.findByBuyerIdPaginated).toHaveBeenCalledWith("buyer_1", {
      page: 1,
      limit: 20,
      type: "beat",
      beatIds: ["beat_9"],
    });
    expect(result.total).toBe(1);
    expect(result.data[0]?.beatTitle).toBe("Night Trap");
    expect(result.data[0]?.coverUrl).toBe("signed:covers/trap.png");
  });

  it("labels missing beats as [Deleted Beat]", async () => {
    vi.mocked(purchaseRepository.findByBuyerIdPaginated).mockResolvedValueOnce(
      paginated([
        {
          _id: "purchase_1",
          beatId: "beat_gone",
          licenseType: "basic",
          includesWav: false,
          includesStems: false,
          amount: 499,
          createdAt: purchasedAt,
        },
      ]) as never
    );
    vi.mocked(beatRepository.findByIds).mockResolvedValueOnce([]);

    const result = await libraryService.getLibrary("buyer_1", 1, 20);

    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.beatTitle).toBe("[Deleted Beat]");
    expect(result.data[0]?.isDeleted).toBe(true);
    expect(result.data[0]?.producerName).toBe("Unknown Producer");
  });
});
