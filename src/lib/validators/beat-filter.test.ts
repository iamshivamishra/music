import { describe, expect, it } from "vitest";
import {
  beatFilterSchema,
  BPM_FILTER_MAX,
  BPM_FILTER_MIN,
  PRICE_FILTER_MAX,
} from "./beat";

describe("beatFilterSchema range params", () => {
  it("treats empty query strings as omitted", () => {
    const result = beatFilterSchema.parse({
      bpmMin: "",
      bpmMax: "",
      priceMin: "",
      priceMax: "",
    });

    expect(result.bpmMin).toBeUndefined();
    expect(result.bpmMax).toBeUndefined();
    expect(result.priceMin).toBeUndefined();
    expect(result.priceMax).toBeUndefined();
  });

  it("accepts BPM and price values at the filter bounds", () => {
    const result = beatFilterSchema.parse({
      bpmMin: String(BPM_FILTER_MIN),
      bpmMax: String(BPM_FILTER_MAX),
      priceMin: "0",
      priceMax: String(PRICE_FILTER_MAX),
    });

    expect(result.bpmMin).toBe(BPM_FILTER_MIN);
    expect(result.bpmMax).toBe(BPM_FILTER_MAX);
    expect(result.priceMin).toBe(0);
    expect(result.priceMax).toBe(PRICE_FILTER_MAX);
  });

  it("rejects BPM and price values outside the allowed range", () => {
    expect(() => beatFilterSchema.parse({ bpmMin: "39" })).toThrow();
    expect(() => beatFilterSchema.parse({ bpmMax: "301" })).toThrow();
    expect(() => beatFilterSchema.parse({ priceMin: "-1" })).toThrow();
    expect(() => beatFilterSchema.parse({ priceMax: "50001" })).toThrow();
  });
});
