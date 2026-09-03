import { describe, expect, it } from "vitest";
import type { IBeat } from "@/types";
import {
  canFulfillBeat,
  canPurchaseBeat,
  canShareBeat,
  canViewBeat,
  generatePrivateToken,
  isLicensable,
  isListed,
  shouldNoIndex,
  tokensMatch,
} from "./beat-access";

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

describe("tokensMatch", () => {
  it("rejects missing values and different lengths without throwing", () => {
    expect(tokensMatch(undefined, "abc")).toBe(false);
    expect(tokensMatch("abc", undefined)).toBe(false);
    expect(tokensMatch("short", "longer-token")).toBe(false);
  });

  it("accepts an exact match", () => {
    expect(tokensMatch("secret-token", "secret-token")).toBe(true);
  });
});

describe("generatePrivateToken", () => {
  it("returns a unique base64url token", () => {
    const token = generatePrivateToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBeGreaterThanOrEqual(20);
    expect(generatePrivateToken()).not.toBe(token);
  });
});

describe("isListed / shouldNoIndex", () => {
  it("treats only published + isPublished as listed", () => {
    expect(isListed(makeBeat())).toBe(true);
    expect(isListed(makeBeat({ status: "unlisted", isPublished: false }))).toBe(false);
    expect(isListed(makeBeat({ status: "published", isPublished: false }))).toBe(false);
    expect(shouldNoIndex(makeBeat({ status: "unlisted", isPublished: false }))).toBe(true);
    expect(shouldNoIndex(makeBeat())).toBe(false);
  });
});

describe("canViewBeat", () => {
  const token = "private-link-token";
  const unlisted = makeBeat({
    status: "unlisted",
    isPublished: false,
    privateToken: token,
  });
  const scheduled = makeBeat({
    status: "scheduled",
    isPublished: false,
    publishAt: new Date(Date.now() + 60_000),
  });
  const draft = makeBeat({ status: "draft", isPublished: false });

  it("allows anyone to view a listed beat", () => {
    expect(canViewBeat(makeBeat())).toBe(true);
  });

  it("allows owner and admin to view any status", () => {
    expect(canViewBeat(draft, { userId: "prod_1" })).toBe(true);
    expect(canViewBeat(scheduled, { userRole: "admin" })).toBe(true);
    expect(canViewBeat(unlisted, { userId: "prod_1" })).toBe(true);
  });

  it("allows unlisted views only with a matching token", () => {
    expect(canViewBeat(unlisted, { accessToken: token })).toBe(true);
    expect(canViewBeat(unlisted, { accessToken: "wrong-token" })).toBe(false);
    expect(canViewBeat(unlisted)).toBe(false);
  });

  it("hides scheduled and draft beats from the public", () => {
    expect(canViewBeat(scheduled, { accessToken: token })).toBe(false);
    expect(canViewBeat(draft)).toBe(false);
  });
});

describe("canPurchaseBeat", () => {
  const token = "private-link-token";
  const unlisted = makeBeat({
    status: "unlisted",
    isPublished: false,
    privateToken: token,
  });

  it("allows listed beats and unlisted beats with a token", () => {
    expect(canPurchaseBeat(makeBeat())).toBe(true);
    expect(canPurchaseBeat(unlisted, { accessToken: token })).toBe(true);
  });

  it("rejects unlisted without a token and never allows draft/scheduled/archived", () => {
    expect(canPurchaseBeat(unlisted)).toBe(false);
    expect(canPurchaseBeat(makeBeat({ status: "draft", isPublished: false }))).toBe(false);
    expect(canPurchaseBeat(makeBeat({ status: "scheduled", isPublished: false }))).toBe(false);
    expect(canPurchaseBeat(makeBeat({ status: "archived", isPublished: false }))).toBe(false);
  });

  it("rejects exclusively sold beats even when listed", () => {
    expect(
      canPurchaseBeat(makeBeat({ exclusiveBuyerId: "buyer_1" as unknown as IBeat["exclusiveBuyerId"] }))
    ).toBe(false);
  });
});

describe("isLicensable", () => {
  it("matches listed or unlisted, independent of token", () => {
    expect(isLicensable(makeBeat())).toBe(true);
    expect(isLicensable(makeBeat({ status: "unlisted", isPublished: false }))).toBe(true);
    expect(isLicensable(makeBeat({ status: "scheduled", isPublished: false }))).toBe(false);
    expect(isLicensable(makeBeat({ status: "draft", isPublished: false }))).toBe(false);
    expect(
      isLicensable(makeBeat({ exclusiveBuyerId: "buyer_1" as unknown as IBeat["exclusiveBuyerId"] }))
    ).toBe(false);
  });
});

describe("canFulfillBeat", () => {
  it("allows listed and unlisted without a token, and blocks everything else", () => {
    expect(canFulfillBeat(makeBeat())).toBe(true);
    expect(canFulfillBeat(makeBeat({ status: "unlisted", isPublished: false }))).toBe(true);
    expect(canFulfillBeat(makeBeat({ status: "scheduled", isPublished: false }))).toBe(false);
    expect(canFulfillBeat(makeBeat({ status: "draft", isPublished: false }))).toBe(false);
    expect(
      canFulfillBeat(makeBeat({ exclusiveBuyerId: "buyer_1" as unknown as IBeat["exclusiveBuyerId"] }))
    ).toBe(false);
  });
});

describe("canShareBeat", () => {
  it("allows listed and unlisted beats only", () => {
    expect(canShareBeat(makeBeat())).toBe(true);
    expect(canShareBeat(makeBeat({ status: "unlisted", isPublished: false }))).toBe(true);
    expect(canShareBeat(makeBeat({ status: "draft", isPublished: false }))).toBe(false);
    expect(canShareBeat(makeBeat({ status: "scheduled", isPublished: false }))).toBe(false);
  });
});
