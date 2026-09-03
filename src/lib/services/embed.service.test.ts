import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError } from "@/lib/errors";
import type { IBeat, IUser } from "@/types";

vi.mock("@/lib/repositories/beat.repository", () => ({
  beatRepository: {
    findById: vi.fn(),
    findPublishedByProducer: vi.fn(),
    incrementEmbedViews: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/user.repository", () => ({
  userRepository: {
    findById: vi.fn(),
    findByUsername: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/license.repository", () => ({
  licenseRepository: {
    findCheapestForBeat: vi.fn(),
    findCheapestForBeats: vi.fn(),
  },
}));

vi.mock("@/lib/services/beat-event.service", () => ({
  beatEventService: {
    record: vi.fn(),
    recordEmbedView: vi.fn(),
  },
}));

import { beatRepository } from "@/lib/repositories/beat.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { licenseRepository } from "@/lib/repositories/license.repository";
import { beatEventService } from "@/lib/services/beat-event.service";
import { embedService } from "./embed.service";

const mockedBeats = vi.mocked(beatRepository);
const mockedUsers = vi.mocked(userRepository);
const mockedLicenses = vi.mocked(licenseRepository);

const BEAT_ID = "507f1f77bcf86cd799439011";
const PRODUCER_ID = "507f1f77bcf86cd799439012";

const publishedBeat = {
  _id: BEAT_ID,
  title: "Midnight",
  coverUrl: "https://cdn.example/cover.jpg",
  audioTaggedUrl: "https://cdn.example/preview.mp3",
  genre: "Hip Hop",
  bpm: 140,
  key: "Am",
  isPublished: true,
  status: "published",
  producerId: PRODUCER_ID,
} as unknown as IBeat;

const producer = {
  _id: PRODUCER_ID,
  role: "producer",
  name: "Aryan",
  displayName: "Aryan Beats",
  username: "aryan",
  avatarUrl: "https://cdn.example/avatar.jpg",
} as unknown as IUser;

describe("embedService.getBeatData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = "https://trishulbeats.com";
  });

  it("returns public payload with src=embed on the PDP url", async () => {
    mockedBeats.findById.mockResolvedValueOnce(publishedBeat);
    mockedUsers.findById.mockResolvedValueOnce(producer);
    mockedLicenses.findCheapestForBeat.mockResolvedValueOnce({ price: 499 } as never);

    const data = await embedService.getBeatData(BEAT_ID);

    expect(data.title).toBe("Midnight");
    expect(data.producerName).toBe("Aryan Beats");
    expect(data.previewUrl).toBe("https://cdn.example/preview.mp3");
    expect(data.price).toBe(499);
    expect(data.pdpUrl).toBe(`https://trishulbeats.com/beats/${BEAT_ID}?src=embed`);
  });

  it("throws NotFoundError for an invalid ObjectId without querying", async () => {
    await expect(embedService.getBeatData("not-an-id")).rejects.toBeInstanceOf(
      NotFoundError
    );
    expect(mockedBeats.findById).not.toHaveBeenCalled();
  });

  it("throws NotFoundError when the beat is unpublished", async () => {
    mockedBeats.findById.mockResolvedValueOnce({
      ...publishedBeat,
      isPublished: false,
    });

    await expect(embedService.getBeatData(BEAT_ID)).rejects.toBeInstanceOf(
      NotFoundError
    );
  });
});

describe("embedService.getProducerCatalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = "https://trishulbeats.com";
  });

  it("throws NotFoundError when the user is not a producer", async () => {
    mockedUsers.findByUsername.mockResolvedValueOnce({
      ...producer,
      role: "buyer",
    } as IUser);

    await expect(embedService.getProducerCatalog("aryan")).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it("clamps the catalog to the requested limit", async () => {
    const beats = Array.from({ length: 15 }, (_, i) => ({
      ...publishedBeat,
      _id: `507f1f77bcf86cd7994390${(20 + i).toString(16)}`,
      title: `Beat ${i}`,
    })) as unknown as IBeat[];

    mockedUsers.findByUsername.mockResolvedValueOnce(producer);
    mockedBeats.findPublishedByProducer.mockResolvedValueOnce(beats.slice(0, 5));
    mockedLicenses.findCheapestForBeats.mockResolvedValueOnce({});

    const catalog = await embedService.getProducerCatalog("aryan", 5);

    expect(mockedBeats.findPublishedByProducer).toHaveBeenCalledWith(PRODUCER_ID, 5);
    expect(catalog.beats).toHaveLength(5);
    expect(catalog.profileUrl).toBe(
      "https://trishulbeats.com/producer/aryan?src=embed"
    );
    expect(catalog.homeUrl).toBe("https://trishulbeats.com");
    expect(catalog.beats[0]?.pdpUrl).toContain("src=embed");
  });

  it("clamps catalog limit to 20 before querying", async () => {
    mockedUsers.findByUsername.mockResolvedValueOnce(producer);
    mockedBeats.findPublishedByProducer.mockResolvedValueOnce([]);
    mockedLicenses.findCheapestForBeats.mockResolvedValueOnce({});

    await embedService.getProducerCatalog("aryan", 99);

    expect(mockedBeats.findPublishedByProducer).toHaveBeenCalledWith(
      PRODUCER_ID,
      20
    );
  });
});

describe("embedService.recordView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("increments embedViews for a published beat", async () => {
    mockedBeats.findById.mockResolvedValueOnce(publishedBeat);
    mockedBeats.incrementEmbedViews.mockResolvedValueOnce(undefined);

    await embedService.recordView(BEAT_ID);

    expect(mockedBeats.incrementEmbedViews).toHaveBeenCalledWith(BEAT_ID);
    expect(beatEventService.recordEmbedView).toHaveBeenCalledWith(BEAT_ID, PRODUCER_ID);
  });

  it("throws NotFoundError when the beat is unpublished", async () => {
    mockedBeats.findById.mockResolvedValueOnce({
      ...publishedBeat,
      isPublished: false,
    });

    await expect(embedService.recordView(BEAT_ID)).rejects.toBeInstanceOf(
      NotFoundError
    );
    expect(mockedBeats.incrementEmbedViews).not.toHaveBeenCalled();
  });

  it("throws NotFoundError for an invalid ObjectId", async () => {
    await expect(embedService.recordView("bad")).rejects.toBeInstanceOf(
      NotFoundError
    );
    expect(mockedBeats.findById).not.toHaveBeenCalled();
  });
});
