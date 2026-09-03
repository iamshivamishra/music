import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BeatFilterInput } from "@/lib/validators/beat";
import type { IBeat, PaginatedResult } from "@/types";

vi.mock("@/lib/repositories/beat.repository", () => ({
  beatRepository: {
    findWithFilters: vi.fn(),
    countPublished: vi.fn(),
    countDistinctGenres: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/license.repository", () => ({
  licenseRepository: {
    findCheapestForBeats: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/user.repository", () => ({
  userRepository: {
    findByIds: vi.fn(),
    countByRole: vi.fn(),
  },
}));

vi.mock("@/lib/services/presign.service", () => ({
  presignService: {
    withPresignedBeatCovers: vi.fn(async (beats: unknown[]) => beats),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { beatRepository } from "@/lib/repositories/beat.repository";
import { licenseRepository } from "@/lib/repositories/license.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { logger } from "@/lib/logger";
import { marketplaceService } from "./marketplace.service";

const mockedBeatRepo = vi.mocked(beatRepository);
const mockedLicenseRepo = vi.mocked(licenseRepository);
const mockedUserRepo = vi.mocked(userRepository);
const mockedLogger = vi.mocked(logger);

function makeBeat(id: string, producerId = "producer_1"): IBeat {
  return {
    _id: id,
    title: `Beat ${id}`,
    genre: "Trap",
    tags: [],
    duration: 120,
    producerId,
    audioTaggedUrl: "https://example.com/tagged.mp3",
    audioFullUrl: "https://example.com/master.wav",
    status: "published",
    isPublished: true,
    plays: 0,
    salesCount: 0,
    likesCount: 0,
    saleMode: "individual",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function pageResult(beats: IBeat[], total = beats.length): PaginatedResult<IBeat> {
  return {
    data: beats,
    total,
    page: 1,
    limit: beats.length || 12,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  };
}

const defaultFilters: BeatFilterInput = {
  page: 1,
  limit: 12,
  sort: "newest",
};

describe("marketplaceService.list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUserRepo.findByIds.mockResolvedValue([
      {
        _id: "producer_1",
        name: "Producer One",
        displayName: "P1",
        username: "p1",
        email: "p1@example.com",
        role: "producer",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  });

  it("excludes out-of-range and null starting prices when a price filter is set", async () => {
    mockedBeatRepo.findWithFilters.mockResolvedValue(
      pageResult([makeBeat("cheap"), makeBeat("mid"), makeBeat("free")])
    );
    mockedLicenseRepo.findCheapestForBeats.mockResolvedValue({
      cheap: { price: 400, licenseId: "l1" },
      mid: { price: 1500, licenseId: "l2" },
    });

    const result = await marketplaceService.list({
      ...defaultFilters,
      priceMin: 0,
      priceMax: 500,
    });

    expect(result.beats.map((beat) => beat._id)).toEqual(["cheap"]);
    expect(result.total).toBe(1);
    expect(result.hasNext).toBe(false);
  });

  it("paginates the filtered set, not the unfiltered query page", async () => {
    const beats = [
      makeBeat("a"),
      makeBeat("b"),
      makeBeat("c"),
      makeBeat("d"),
      makeBeat("e"),
    ];
    mockedBeatRepo.findWithFilters.mockResolvedValue(pageResult(beats));
    mockedLicenseRepo.findCheapestForBeats.mockResolvedValue({
      a: { price: 200, licenseId: "l1" },
      b: { price: 300, licenseId: "l2" },
      c: { price: 400, licenseId: "l3" },
      d: { price: 9000, licenseId: "l4" },
      e: { price: 500, licenseId: "l5" },
    });

    const result = await marketplaceService.list({
      ...defaultFilters,
      priceMax: 500,
      page: 2,
      limit: 2,
    });

    expect(result.beats.map((beat) => beat._id)).toEqual(["c", "e"]);
    expect(result.total).toBe(4);
    expect(result.page).toBe(2);
    expect(result.hasNext).toBe(false);
    expect(result.totalPages).toBe(2);
  });

  it("sorts by joined cheapest price for price_asc", async () => {
    mockedBeatRepo.findWithFilters.mockResolvedValue(
      pageResult([makeBeat("high"), makeBeat("low"), makeBeat("mid")])
    );
    mockedLicenseRepo.findCheapestForBeats.mockResolvedValue({
      high: { price: 9999, licenseId: "l1" },
      low: { price: 499, licenseId: "l2" },
      mid: { price: 1499, licenseId: "l3" },
    });

    const result = await marketplaceService.list({
      ...defaultFilters,
      sort: "price_asc",
    });

    expect(result.beats.map((beat) => beat._id)).toEqual(["low", "mid", "high"]);
  });

  it("does not apply a price cut when price params are omitted", async () => {
    mockedBeatRepo.findWithFilters.mockResolvedValue(
      pageResult([makeBeat("cheap"), makeBeat("expensive")])
    );
    mockedLicenseRepo.findCheapestForBeats.mockResolvedValue({
      cheap: { price: 100, licenseId: "l1" },
      expensive: { price: 40_000, licenseId: "l2" },
    });

    const result = await marketplaceService.list(defaultFilters);

    expect(result.beats).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(mockedBeatRepo.findWithFilters).toHaveBeenCalledWith(
      expect.anything(),
      1,
      12,
      "newest"
    );
  });

  it("reports total and hasNext from the filtered set", async () => {
    mockedBeatRepo.findWithFilters.mockResolvedValue(
      pageResult([makeBeat("a"), makeBeat("b"), makeBeat("c")])
    );
    mockedLicenseRepo.findCheapestForBeats.mockResolvedValue({
      a: { price: 200, licenseId: "l1" },
      b: { price: 300, licenseId: "l2" },
      c: { price: 400, licenseId: "l3" },
    });

    const result = await marketplaceService.list({
      ...defaultFilters,
      priceMax: 500,
      limit: 2,
    });

    expect(result.total).toBe(3);
    expect(result.hasNext).toBe(true);
    expect(result.beats).toHaveLength(2);
  });

  it("warns when the price scan hits the cap", async () => {
    mockedBeatRepo.findWithFilters.mockResolvedValue({
      ...pageResult([makeBeat("a")]),
      total: 501,
    });
    mockedLicenseRepo.findCheapestForBeats.mockResolvedValue({
      a: { price: 200, licenseId: "l1" },
    });

    await marketplaceService.list({
      ...defaultFilters,
      priceMax: 500,
    });

    expect(mockedLogger.warn).toHaveBeenCalled();
  });
});
