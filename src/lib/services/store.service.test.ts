import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import type { IBeat, IBeatPack, IUser, PaginatedResult } from "@/types";

vi.mock("@/lib/repositories/user.repository", () => ({
  userRepository: {
    findByUsername: vi.fn(),
    findById: vi.fn(),
    updateStore: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/beat.repository", () => ({
  beatRepository: {
    findByProducerId: vi.fn(),
    findByIds: vi.fn(),
    findByProducerPaginated: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/pack.repository", () => ({
  packRepository: {
    findById: vi.fn(),
    findByProducerPaginated: vi.fn(),
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

vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { userRepository } from "@/lib/repositories/user.repository";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { packRepository } from "@/lib/repositories/pack.repository";
import { storeService } from "./store.service";

const mockedUserRepo = vi.mocked(userRepository);
const mockedBeatRepo = vi.mocked(beatRepository);
const mockedPackRepo = vi.mocked(packRepository);

function makeProducer(overrides: Partial<IUser> = {}): IUser {
  return {
    _id: "producer_1",
    name: "Arjun",
    email: "arjun@example.com",
    role: "producer",
    username: "arjun",
    displayName: "Arjun Beats",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

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

function makePack(id: string, overrides: Partial<IBeatPack> = {}): IBeatPack {
  return {
    _id: id,
    title: `Pack ${id}`,
    slug: `pack-${id}`,
    producerId: "producer_1",
    beats: [],
    coverImages: [],
    tiers: [],
    status: "published",
    isPublished: true,
    salesCount: 0,
    tags: [],
    genre: "Trap",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function emptyPage<T>(data: T[]): PaginatedResult<T> {
  return {
    data,
    total: data.length,
    page: 1,
    limit: 100,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  };
}

describe("storeService.getStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when the producer is missing", async () => {
    mockedUserRepo.findByUsername.mockResolvedValueOnce(null);

    await expect(storeService.getStore("missing")).resolves.toBeNull();
  });

  it("drops ineligible pins on read and backfills newest eligible beats", async () => {
    mockedUserRepo.findByUsername.mockResolvedValueOnce(
      makeProducer({
        store: { pinnedBeatIds: ["archived", "exclusive", "packonly", "ok"] },
      })
    );
    mockedBeatRepo.findByProducerId.mockResolvedValueOnce([
      makeBeat("newest"),
      makeBeat("ok"),
      makeBeat("packonly", { saleMode: "pack_only" }),
      makeBeat("exclusive", { exclusiveBuyerId: "buyer_1" }),
      makeBeat("archived", { status: "archived", isPublished: false }),
    ]);

    const result = await storeService.getStore("arjun");

    expect(result).not.toBeNull();
    expect(result?.pinned.map((item) => item.beat._id.toString())).toEqual([
      "ok",
      "newest",
    ]);
    expect(result?.catalog.map((item) => item.beat._id.toString())).toEqual([
      "packonly",
    ]);
    expect(result?.beats.map((item) => item.beat._id.toString())).toEqual([
      "newest",
      "ok",
      "packonly",
    ]);
  });

  it("preserves stored pin order", async () => {
    mockedUserRepo.findByUsername.mockResolvedValueOnce(
      makeProducer({ store: { pinnedBeatIds: ["c", "a"] } })
    );
    mockedBeatRepo.findByProducerId.mockResolvedValueOnce([
      makeBeat("a"),
      makeBeat("b"),
      makeBeat("c"),
    ]);

    const result = await storeService.getStore("arjun");

    expect(result?.pinned.map((item) => item.beat._id.toString())).toEqual([
      "c",
      "a",
      "b",
    ]);
  });

  it("omits a featured pack that is unpublished or owned by someone else", async () => {
    mockedUserRepo.findByUsername.mockResolvedValueOnce(
      makeProducer({ store: { featuredPackId: "pack_1" } })
    );
    mockedBeatRepo.findByProducerId.mockResolvedValueOnce([]);
    mockedPackRepo.findById.mockResolvedValueOnce(
      makePack("pack_1", { isPublished: false, status: "draft" })
    );

    const unpublished = await storeService.getStore("arjun");
    expect(unpublished?.featuredPack).toBeNull();

    mockedUserRepo.findByUsername.mockResolvedValueOnce(
      makeProducer({ store: { featuredPackId: "pack_2" } })
    );
    mockedBeatRepo.findByProducerId.mockResolvedValueOnce([]);
    mockedPackRepo.findById.mockResolvedValueOnce(
      makePack("pack_2", { producerId: "other_producer" })
    );

    const otherOwner = await storeService.getStore("arjun");
    expect(otherOwner?.featuredPack).toBeNull();
  });

  it("includes a published owned featured pack", async () => {
    mockedUserRepo.findByUsername.mockResolvedValueOnce(
      makeProducer({ store: { featuredPackId: "pack_1" } })
    );
    mockedBeatRepo.findByProducerId.mockResolvedValueOnce([]);
    mockedPackRepo.findById.mockResolvedValueOnce(makePack("pack_1"));

    const result = await storeService.getStore("arjun");
    expect(result?.featuredPack?.title).toBe("Pack pack_1");
  });
});

describe("storeService.updateStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUserRepo.findById.mockResolvedValue(makeProducer());
    mockedUserRepo.updateStore.mockImplementation(async (_id, store) =>
      makeProducer({ store })
    );
  });

  it("rejects pins that are not owned by the producer", async () => {
    mockedBeatRepo.findByIds.mockResolvedValueOnce([
      makeBeat("stolen", { producerId: "someone_else" }),
    ]);

    await expect(
      storeService.updateStore(
        "producer_1",
        { pinnedBeatIds: ["stolen"] },
        "producer_1",
        "producer"
      )
    ).rejects.toBeInstanceOf(ValidationError);
    expect(mockedUserRepo.updateStore).not.toHaveBeenCalled();
  });

  it("rejects pack_only and exclusive-sold pins", async () => {
    mockedBeatRepo.findByIds.mockResolvedValueOnce([
      makeBeat("packonly", { saleMode: "pack_only" }),
    ]);

    await expect(
      storeService.updateStore(
        "producer_1",
        { pinnedBeatIds: ["packonly"] },
        "producer_1",
        "producer"
      )
    ).rejects.toBeInstanceOf(ValidationError);

    mockedBeatRepo.findByIds.mockResolvedValueOnce([
      makeBeat("sold", { exclusiveBuyerId: "buyer_1" }),
    ]);

    await expect(
      storeService.updateStore(
        "producer_1",
        { pinnedBeatIds: ["sold"] },
        "producer_1",
        "producer"
      )
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects more than 3 pins", async () => {
    await expect(
      storeService.updateStore(
        "producer_1",
        { pinnedBeatIds: ["1", "2", "3", "4"] },
        "producer_1",
        "producer"
      )
    ).rejects.toBeInstanceOf(ValidationError);
    expect(mockedBeatRepo.findByIds).not.toHaveBeenCalled();
  });

  it("forbids another producer from updating the store", async () => {
    await expect(
      storeService.updateStore(
        "producer_1",
        { pinnedBeatIds: [] },
        "producer_2",
        "producer"
      )
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("allows an admin to update another producer's store", async () => {
    mockedBeatRepo.findByIds.mockResolvedValueOnce([makeBeat("1")]);

    await storeService.updateStore(
      "producer_1",
      { pinnedBeatIds: ["1"], headline: "New drops" },
      "admin_1",
      "admin"
    );

    expect(mockedUserRepo.updateStore).toHaveBeenCalledWith(
      "producer_1",
      expect.objectContaining({
        headline: "New drops",
        pinnedBeatIds: ["1"],
      })
    );
  });

  it("rejects an unpublished featured pack", async () => {
    mockedPackRepo.findById.mockResolvedValueOnce(
      makePack("pack_1", { isPublished: false, status: "draft" })
    );

    await expect(
      storeService.updateStore(
        "producer_1",
        { pinnedBeatIds: [], featuredPackId: "pack_1" },
        "producer_1",
        "producer"
      )
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("throws NotFoundError when the producer is missing", async () => {
    mockedUserRepo.findById.mockResolvedValueOnce(null);

    await expect(
      storeService.updateStore("missing", { pinnedBeatIds: [] }, "missing", "producer")
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("storeService.getEditorData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns pin candidates excluding pack_only beats", async () => {
    mockedUserRepo.findById.mockResolvedValueOnce(
      makeProducer({
        store: { headline: "Fire", pinnedBeatIds: ["1"] },
        socialLinks: { whatsappNumber: "9876543210" },
      })
    );
    mockedBeatRepo.findByProducerPaginated.mockResolvedValueOnce(
      emptyPage([
        makeBeat("1"),
        makeBeat("packonly", { saleMode: "pack_only" }),
      ])
    );
    mockedPackRepo.findByProducerPaginated.mockResolvedValueOnce(
      emptyPage([makePack("pack_1")])
    );

    const result = await storeService.getEditorData("producer_1");

    expect(result.beats.map((beat) => beat._id)).toEqual(["1"]);
    expect(result.packs).toHaveLength(1);
    expect(result.store.headline).toBe("Fire");
    expect(result.producer.hasWhatsApp).toBe(true);
  });
});
