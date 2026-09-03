import { describe, expect, it } from "vitest";
import { ConflictError, NotFoundError } from "@/lib/errors";
import type { IBeat } from "@/types";
import {
  assertBeatFulfillable,
  assertBeatLicensable,
  assertBeatPurchasable,
} from "./purchase-guards";

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

describe("assertBeatPurchasable", () => {
  const token = "private-link-token";
  const unlisted = makeBeat({
    status: "unlisted",
    isPublished: false,
    privateToken: token,
  });

  it("throws NotFoundError when the beat is missing", () => {
    expect(() => assertBeatPurchasable(null)).toThrow(NotFoundError);
  });

  it("rejects unlisted beats without a token", () => {
    expect(() => assertBeatPurchasable(unlisted)).toThrow(ConflictError);
  });

  it("allows unlisted beats with a matching token", () => {
    expect(() =>
      assertBeatPurchasable(unlisted, undefined, { accessToken: token })
    ).not.toThrow();
  });

  it("allows listed beats without a token", () => {
    expect(() => assertBeatPurchasable(makeBeat())).not.toThrow();
  });
});

describe("assertBeatLicensable", () => {
  it("allows listed and unlisted without a token", () => {
    expect(() => assertBeatLicensable(makeBeat())).not.toThrow();
    expect(() =>
      assertBeatLicensable(makeBeat({ status: "unlisted", isPublished: false }))
    ).not.toThrow();
  });

  it("rejects draft, scheduled, and exclusively sold beats", () => {
    expect(() =>
      assertBeatLicensable(makeBeat({ status: "draft", isPublished: false }))
    ).toThrow(ConflictError);
    expect(() =>
      assertBeatLicensable(makeBeat({ status: "scheduled", isPublished: false }))
    ).toThrow(ConflictError);
    expect(() =>
      assertBeatLicensable(
        makeBeat({ exclusiveBuyerId: "buyer_1" as unknown as IBeat["exclusiveBuyerId"] })
      )
    ).toThrow(ConflictError);
  });
});

describe("assertBeatFulfillable", () => {
  it("allows unlisted beats after payment succeeds", () => {
    expect(() =>
      assertBeatFulfillable(
        makeBeat({ status: "unlisted", isPublished: false, privateToken: "t" })
      )
    ).not.toThrow();
  });

  it("rejects scheduled and draft beats", () => {
    expect(() =>
      assertBeatFulfillable(makeBeat({ status: "scheduled", isPublished: false }))
    ).toThrow(ConflictError);
    expect(() =>
      assertBeatFulfillable(makeBeat({ status: "draft", isPublished: false }))
    ).toThrow(ConflictError);
  });
});
