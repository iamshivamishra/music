import { describe, expect, it } from "vitest";
import { toMarketplaceBeat, toBrowseGridItem } from "./marketplace-beat";
import type { IBeat, IUser } from "@/types";

function makeBeat(overrides: Partial<IBeat> = {}): IBeat {
  return {
    _id: "beat_1",
    title: "Test Beat",
    genre: "Trap",
    tags: [],
    duration: 120,
    producerId: "producer_1",
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
  };
}

function makeProducer(
  overrides: Partial<Pick<IUser, "displayName" | "name" | "username" | "producerTier">> = {}
): Pick<IUser, "displayName" | "name" | "username" | "producerTier"> {
  return {
    name: "Producer One",
    displayName: "P1",
    username: "p1",
    ...overrides,
  };
}

describe("toMarketplaceBeat", () => {
  it("maps a beat with producer and cheapest license", () => {
    const result = toMarketplaceBeat(
      makeBeat(),
      makeProducer(),
      { price: 499, licenseId: "l1" }
    );

    expect(result.startingPrice).toBe(499);
    expect(result.producerName).toBe("P1");
    expect(result.producerUsername).toBe("p1");
  });

  it("sets startingPrice to null when no cheapest license", () => {
    const result = toMarketplaceBeat(makeBeat(), makeProducer(), undefined);
    expect(result.startingPrice).toBeNull();
  });

  it("sets producerUsername to undefined (not null) when producer has no username", () => {
    const result = toMarketplaceBeat(
      makeBeat(),
      makeProducer({ username: undefined }),
      { price: 100, licenseId: "l1" }
    );

    expect(result.producerUsername).toBeUndefined();
    expect("producerUsername" in result).toBe(true);
  });

  it("falls back to 'Unknown' when no producer is provided", () => {
    const result = toMarketplaceBeat(makeBeat(), undefined, undefined);
    expect(result.producerName).toBe("Unknown");
    expect(result.producerUsername).toBeUndefined();
  });

  it("strips sensitive fields via toPublicBeatPayload", () => {
    const result = toMarketplaceBeat(
      makeBeat({ audioFullUrl: "https://secret.com/full.wav" }),
      makeProducer(),
      undefined
    );

    expect(result).not.toHaveProperty("audioFullUrl");
  });

  it("passes through producerTier for founding producers", () => {
    const result = toMarketplaceBeat(
      makeBeat(),
      makeProducer({ producerTier: "founding" }),
      { price: 199, licenseId: "l1" }
    );

    expect(result.producerTier).toBe("founding");
  });
});

describe("toBrowseGridItem", () => {
  it("wraps a marketplace beat for the browse grid", () => {
    const mBeat = toMarketplaceBeat(
      makeBeat(),
      makeProducer(),
      { price: 299, licenseId: "l1" }
    );

    const item = toBrowseGridItem(mBeat);
    expect(item.beat).toBe(mBeat);
    expect(item.startingPrice).toBe(299);
  });

  it("returns null startingPrice when beat has no cheapest license", () => {
    const mBeat = toMarketplaceBeat(makeBeat(), makeProducer(), undefined);
    const item = toBrowseGridItem(mBeat);
    expect(item.startingPrice).toBeNull();
  });
});
