import { describe, expect, it } from "vitest";
import {
  beatsHref,
  hasActiveDiscoveryFilters,
  parseFilterBound,
  rangePatch,
  QUICK_FILTER_PILLS,
  type BeatsQueryParams,
} from "./beats-query";
import { BPM_FILTER_MIN, BPM_FILTER_MAX } from "@/lib/validators/beat";

describe("hasActiveDiscoveryFilters", () => {
  it("returns false when only page/limit/sort are set", () => {
    expect(hasActiveDiscoveryFilters({ page: "2", limit: "12", sort: "newest" })).toBe(false);
  });

  it("returns false for empty params", () => {
    expect(hasActiveDiscoveryFilters({})).toBe(false);
  });

  it("returns true when genre is set", () => {
    expect(hasActiveDiscoveryFilters({ genre: "Trap" })).toBe(true);
  });

  it("returns true when bpmMin is set", () => {
    expect(hasActiveDiscoveryFilters({ bpmMin: "60" })).toBe(true);
  });

  it("returns true when priceMax is set", () => {
    expect(hasActiveDiscoveryFilters({ priceMax: "500" })).toBe(true);
  });
});

describe("beatsHref", () => {
  it("builds /beats with query params", () => {
    expect(beatsHref({}, { genre: "Trap" })).toBe("/beats?genre=Trap");
  });

  it("removes a param when patched with null", () => {
    expect(beatsHref({ genre: "Trap", sort: "newest" }, { genre: null })).toBe(
      "/beats?sort=newest"
    );
  });

  it("always drops page from result", () => {
    expect(beatsHref({ page: "3", genre: "Trap" }, { sort: "popular" })).toBe(
      "/beats?genre=Trap&sort=popular"
    );
  });

  it("returns bare /beats when all params are removed", () => {
    expect(beatsHref({ genre: "Trap" }, { genre: null })).toBe("/beats");
  });
});

describe("parseFilterBound", () => {
  it("returns fallback for undefined", () => {
    expect(parseFilterBound(undefined, 40)).toBe(40);
  });

  it("returns fallback for empty string", () => {
    expect(parseFilterBound("", 40)).toBe(40);
  });

  it("parses a numeric string", () => {
    expect(parseFilterBound("120", 40)).toBe(120);
  });

  it("returns fallback for non-numeric string", () => {
    expect(parseFilterBound("abc", 40)).toBe(40);
  });
});

describe("rangePatch", () => {
  it("omits full-range bounds (returns null)", () => {
    const patch = rangePatch(
      [BPM_FILTER_MIN, BPM_FILTER_MAX],
      "bpmMin",
      "bpmMax",
      BPM_FILTER_MIN,
      BPM_FILTER_MAX
    );
    expect(patch.bpmMin).toBeNull();
    expect(patch.bpmMax).toBeNull();
  });

  it("returns string values for non-default bounds", () => {
    const patch = rangePatch([60, 150], "bpmMin", "bpmMax", BPM_FILTER_MIN, BPM_FILTER_MAX);
    expect(patch.bpmMin).toBe("60");
    expect(patch.bpmMax).toBe("150");
  });

  it("returns null for min and string for max when only max changes", () => {
    const patch = rangePatch(
      [BPM_FILTER_MIN, 150],
      "bpmMin",
      "bpmMax",
      BPM_FILTER_MIN,
      BPM_FILTER_MAX
    );
    expect(patch.bpmMin).toBeNull();
    expect(patch.bpmMax).toBe("150");
  });
});

describe("QUICK_FILTER_PILLS", () => {
  it("has pills for under-500, under-1000, bpm-60-90, bpm-120-150", () => {
    const ids = QUICK_FILTER_PILLS.map((p) => p.id);
    expect(ids).toEqual(["under-500", "under-1000", "bpm-60-90", "bpm-120-150"]);
  });

  it("under-500 pill toggles correctly", () => {
    const pill = QUICK_FILTER_PILLS.find((p) => p.id === "under-500")!;

    const inactive: BeatsQueryParams = {};
    expect(pill.isActive(inactive)).toBe(false);
    expect(pill.patch(false)).toEqual({ priceMin: null, priceMax: "500" });

    const active: BeatsQueryParams = { priceMax: "500" };
    expect(pill.isActive(active)).toBe(true);
    expect(pill.patch(true)).toEqual({ priceMax: null });
  });

  it("bpm-60-90 pill toggles correctly", () => {
    const pill = QUICK_FILTER_PILLS.find((p) => p.id === "bpm-60-90")!;

    expect(pill.isActive({ bpmMin: "60", bpmMax: "90" })).toBe(true);
    expect(pill.isActive({})).toBe(false);
    expect(pill.patch(false)).toEqual({ bpmMin: "60", bpmMax: "90" });
    expect(pill.patch(true)).toEqual({ bpmMin: null, bpmMax: null });
  });
});
