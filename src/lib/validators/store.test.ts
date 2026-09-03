import { describe, expect, it } from "vitest";
import { updateStoreSchema } from "./store";

describe("updateStoreSchema", () => {
  it("accepts a valid payload", () => {
    const result = updateStoreSchema.parse({
      headline: "New drops every Friday",
      showWhatsApp: true,
      pinnedBeatIds: ["a", "b", "c"],
      featuredPackId: "pack_1",
    });

    expect(result.headline).toBe("New drops every Friday");
    expect(result.pinnedBeatIds).toEqual(["a", "b", "c"]);
    expect(result.featuredPackId).toBe("pack_1");
  });

  it("treats an empty headline as omitted", () => {
    const result = updateStoreSchema.parse({ headline: "   ", pinnedBeatIds: [] });
    expect(result.headline).toBeUndefined();
  });

  it("rejects a headline over 80 characters", () => {
    expect(() =>
      updateStoreSchema.parse({ headline: "x".repeat(81), pinnedBeatIds: [] })
    ).toThrow();
  });

  it("rejects more than 3 pins", () => {
    expect(() =>
      updateStoreSchema.parse({ pinnedBeatIds: ["1", "2", "3", "4"] })
    ).toThrow();
  });

  it("rejects duplicate pin ids", () => {
    expect(() =>
      updateStoreSchema.parse({ pinnedBeatIds: ["1", "1"] })
    ).toThrow();
  });

  it("allows a null featured pack", () => {
    const result = updateStoreSchema.parse({
      pinnedBeatIds: [],
      featuredPackId: null,
    });
    expect(result.featuredPackId).toBeNull();
  });

  it("defaults pinnedBeatIds to an empty array", () => {
    const result = updateStoreSchema.parse({});
    expect(result.pinnedBeatIds).toEqual([]);
  });
});
