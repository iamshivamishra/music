import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import type { IBeat } from "@/types";

vi.mock("@/lib/repositories/beat.repository", () => ({
  beatRepository: {
    findById: vi.fn(),
    incrementSharesCount: vi.fn(),
    findByProducerId: vi.fn(),
    incrementPlays: vi.fn(),
    findDueScheduled: vi.fn(),
    markPublishedMany: vi.fn(),
    countDueScheduled: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/license.repository", () => ({
  licenseRepository: {
    findByBeatId: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/purchase.repository", () => ({
  purchaseRepository: {
    hasPurchased: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/like.repository", () => ({
  likeRepository: {},
}));

vi.mock("@/lib/repositories/user.repository", () => ({
  userRepository: {},
}));

vi.mock("@/lib/repositories/pack.repository", () => ({
  packRepository: {
    findPublishedPackContainingBeat: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  withTransaction: vi.fn(),
}));

vi.mock("@/lib/serializers/beat", () => ({
  toPublicBeatForUi: vi.fn(),
  generateBeatDescription: vi.fn(),
}));

vi.mock("@/lib/validators/license", () => ({
  LICENSE_DEFAULTS: [],
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/repositories/earning.repository", () => ({
  earningRepository: {
    sumGrossByProducer: vi.fn(),
  },
}));

vi.mock("@/lib/services/beat-event.service", () => ({
  beatEventService: { record: vi.fn(), recordCheckoutStarts: vi.fn() },
}));

import { beatRepository } from "@/lib/repositories/beat.repository";
import { licenseRepository } from "@/lib/repositories/license.repository";
import { packRepository } from "@/lib/repositories/pack.repository";
import { beatEventService } from "@/lib/services/beat-event.service";
import {
  beatCommandService,
  beatPageService,
  beatQueryService,
  beatService,
} from "./beat.service";

const mockedRepo = vi.mocked(beatRepository);

function makeBeat(overrides: Partial<IBeat> = {}): IBeat {
  return {
    _id: "beat_1",
    title: "Night Drive",
    genre: "Trap",
    tags: [],
    duration: 120,
    producerId: "prod_1",
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
    ...overrides,
  } as IBeat;
}

describe("beatService facade", () => {
  it("spreads query, command, and page methods", () => {
    expect(beatService.list).toBe(beatQueryService.list);
    expect(beatService.create).toBe(beatCommandService.create);
    expect(beatService.getDetailPageData).toBe(beatPageService.getDetailPageData);
  });
});

describe("beatService.incrementShareCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws NotFoundError when the beat is missing", async () => {
    mockedRepo.findById.mockResolvedValueOnce(null);

    await expect(beatService.incrementShareCount("missing")).rejects.toBeInstanceOf(
      NotFoundError
    );
    expect(mockedRepo.incrementSharesCount).not.toHaveBeenCalled();
  });

  it("throws NotFoundError when the beat is unpublished", async () => {
    mockedRepo.findById.mockResolvedValueOnce({
      status: "draft",
      isPublished: false,
    } as IBeat);

    await expect(beatService.incrementShareCount("draft")).rejects.toBeInstanceOf(
      NotFoundError
    );
    expect(mockedRepo.incrementSharesCount).not.toHaveBeenCalled();
  });

  it("increments sharesCount for a published beat", async () => {
    mockedRepo.findById.mockResolvedValueOnce({
      status: "published",
      isPublished: true,
    } as IBeat);
    mockedRepo.incrementSharesCount.mockResolvedValueOnce(undefined);

    await beatService.incrementShareCount("published-id", "whatsapp");

    expect(mockedRepo.incrementSharesCount).toHaveBeenCalledWith("published-id");
    expect(beatEventService.record).toHaveBeenCalledWith({
      beatId: "published-id",
      kind: "share",
      source: "whatsapp",
    });
  });

  it("increments sharesCount for an unlisted beat", async () => {
    mockedRepo.findById.mockResolvedValueOnce({
      status: "unlisted",
      isPublished: false,
    } as IBeat);
    mockedRepo.incrementSharesCount.mockResolvedValueOnce(undefined);

    await beatService.incrementShareCount("unlisted-id");

    expect(mockedRepo.incrementSharesCount).toHaveBeenCalledWith("unlisted-id");
  });
});

describe("beatService.incrementPlays", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("increments plays and records a play event", async () => {
    mockedRepo.incrementPlays.mockResolvedValueOnce(undefined);

    await beatService.incrementPlays("beat_1", "charts");

    expect(mockedRepo.incrementPlays).toHaveBeenCalledWith("beat_1");
    expect(beatEventService.record).toHaveBeenCalledWith({
      beatId: "beat_1",
      kind: "play",
      source: "charts",
    });
  });
});

describe("beatService.getPublicDetail access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(licenseRepository.findByBeatId).mockResolvedValue([]);
  });

  it("throws NotFoundError for an unlisted beat without a token", async () => {
    mockedRepo.findById.mockResolvedValueOnce(
      makeBeat({
        status: "unlisted",
        isPublished: false,
        privateToken: "secret-token",
      })
    );

    await expect(beatService.getPublicDetail("beat_1")).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it("throws NotFoundError when the token does not match", async () => {
    mockedRepo.findById.mockResolvedValueOnce(
      makeBeat({
        status: "unlisted",
        isPublished: false,
        privateToken: "secret-token",
      })
    );

    await expect(
      beatService.getPublicDetail("beat_1", undefined, undefined, "wrong-token")
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("returns the beat when the private token matches", async () => {
    mockedRepo.findById.mockResolvedValueOnce(
      makeBeat({
        status: "unlisted",
        isPublished: false,
        privateToken: "secret-token",
      })
    );

    const result = await beatService.getPublicDetail(
      "beat_1",
      undefined,
      undefined,
      "secret-token"
    );
    expect(result.beat._id).toBe("beat_1");
    expect(result.beat.privateToken).toBeUndefined();
  });
});

describe("beatService.unlockUnlisted", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves when the beat is unlisted and the token matches", async () => {
    mockedRepo.findById.mockResolvedValueOnce(
      makeBeat({
        status: "unlisted",
        isPublished: false,
        privateToken: "secret-token",
      })
    );

    await expect(beatService.unlockUnlisted("beat_1", "secret-token")).resolves.toBeUndefined();
  });

  it("returns NotFoundError for a missing beat, wrong token, or non-unlisted status", async () => {
    mockedRepo.findById.mockResolvedValueOnce(null);
    await expect(beatService.unlockUnlisted("missing", "secret-token")).rejects.toBeInstanceOf(
      NotFoundError
    );

    mockedRepo.findById.mockResolvedValueOnce(
      makeBeat({
        status: "unlisted",
        isPublished: false,
        privateToken: "secret-token",
      })
    );
    await expect(beatService.unlockUnlisted("beat_1", "wrong-token")).rejects.toBeInstanceOf(
      NotFoundError
    );

    mockedRepo.findById.mockResolvedValueOnce(makeBeat());
    await expect(beatService.unlockUnlisted("beat_1", "secret-token")).rejects.toBeInstanceOf(
      NotFoundError
    );
  });
});

describe("beatService.rotatePrivateToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rotates the token for an unlisted owner beat", async () => {
    mockedRepo.findById.mockResolvedValueOnce(
      makeBeat({
        status: "unlisted",
        isPublished: false,
        privateToken: "old-token",
      })
    );
    mockedRepo.update.mockResolvedValueOnce(
      makeBeat({
        status: "unlisted",
        isPublished: false,
        privateToken: "new-token",
      })
    );

    const updated = await beatService.rotatePrivateToken("beat_1", "prod_1", "producer");
    expect(mockedRepo.update).toHaveBeenCalledWith(
      "beat_1",
      expect.objectContaining({ privateToken: expect.any(String) })
    );
    expect(updated.privateToken).toBe("new-token");
  });

  it("rejects rotation for a published beat", async () => {
    mockedRepo.findById.mockResolvedValueOnce(makeBeat());
    await expect(
      beatService.rotatePrivateToken("beat_1", "prod_1", "producer")
    ).rejects.toBeInstanceOf(ConflictError);
  });
});

describe("beatService.publishDueScheduled", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("publishes a capped batch and reports remainder", async () => {
    const due = Array.from({ length: 101 }, (_, index) =>
      makeBeat({
        _id: `beat_${index}`,
        status: index === 0 ? "unlisted" : "scheduled",
        isPublished: false,
        privateToken: index === 0 ? "drop-token" : undefined,
        publishAt: new Date("2026-09-03T00:00:00.000Z"),
      })
    );
    mockedRepo.findDueScheduled.mockResolvedValueOnce(due);
    mockedRepo.markPublishedMany.mockResolvedValueOnce(100);
    mockedRepo.countDueScheduled.mockResolvedValueOnce(12);

    const result = await beatService.publishDueScheduled(new Date("2026-09-04T00:00:00.000Z"));

    expect(mockedRepo.markPublishedMany).toHaveBeenCalledWith(
      due.slice(0, 100).map((beat) => beat._id.toString()),
      expect.any(Date)
    );
    expect(due[0].status).toBe("unlisted");
    expect(result).toEqual({ published: 100, remaining: 12 });
  });
});

describe("beatService.unlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(packRepository.findPublishedPackContainingBeat).mockResolvedValue(null);
  });

  it("generates a private token when unlisting", async () => {
    mockedRepo.findById.mockResolvedValue(
      makeBeat({ status: "draft", isPublished: false })
    );
    mockedRepo.update.mockResolvedValueOnce(
      makeBeat({ status: "unlisted", isPublished: false, privateToken: "generated" })
    );

    await beatService.unlist("beat_1", "prod_1", "producer");

    expect(mockedRepo.update).toHaveBeenCalledWith(
      "beat_1",
      expect.objectContaining({
        status: "unlisted",
        isPublished: false,
        privateToken: expect.any(String),
      }),
      expect.objectContaining({ unset: expect.arrayContaining(["publishAt"]) })
    );
  });

  it("keeps publishAt when unlisting with a go-live time", async () => {
    const publishAt = new Date("2026-09-10T12:00:00.000Z");
    mockedRepo.findById.mockResolvedValue(
      makeBeat({ status: "draft", isPublished: false })
    );
    mockedRepo.update.mockResolvedValueOnce(
      makeBeat({ status: "unlisted", isPublished: false, privateToken: "generated", publishAt })
    );

    await beatService.unlist("beat_1", "prod_1", "producer", publishAt);

    expect(mockedRepo.update).toHaveBeenCalledWith(
      "beat_1",
      expect.objectContaining({
        status: "unlisted",
        publishAt,
        privateToken: expect.any(String),
      }),
      expect.not.objectContaining({ unset: expect.arrayContaining(["publishAt"]) })
    );
  });
});

describe("beatService.schedule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(packRepository.findPublishedPackContainingBeat).mockResolvedValue(null);
  });

  it("requires publishAt", async () => {
    mockedRepo.findById.mockResolvedValue(
      makeBeat({ status: "draft", isPublished: false })
    );

    await expect(
      beatService.update("beat_1", "prod_1", "producer", { status: "scheduled" })
    ).rejects.toBeInstanceOf(ValidationError);
    expect(mockedRepo.update).not.toHaveBeenCalled();
  });
});

describe("beatService.listOfferableByProducer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns published beats that are not exclusively sold", async () => {
    mockedRepo.findByProducerId.mockResolvedValueOnce([
      makeBeat({ _id: "beat_1", title: "Open" }),
      makeBeat({
        _id: "beat_2",
        title: "Sold",
        exclusiveBuyerId: "buyer_x" as unknown as IBeat["exclusiveBuyerId"],
      }),
    ]);

    const result = await beatService.listOfferableByProducer("prod_1");

    expect(mockedRepo.findByProducerId).toHaveBeenCalledWith("prod_1", false);
    expect(result).toEqual([{ id: "beat_1", title: "Open", coverUrl: undefined }]);
  });
});

