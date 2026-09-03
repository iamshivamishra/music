import { describe, expect, it } from "vitest";
import { libraryQuerySchema } from "./library";

describe("libraryQuerySchema", () => {
  it("defaults page and limit", () => {
    expect(libraryQuerySchema.parse({})).toEqual({
      page: 1,
      limit: 20,
    });
  });

  it("trims search and coerces pagination", () => {
    expect(
      libraryQuerySchema.parse({ page: "2", limit: "10", search: " trap " })
    ).toEqual({
      page: 2,
      limit: 10,
      search: "trap",
    });
  });

  it("rejects out-of-range pagination", () => {
    expect(() => libraryQuerySchema.parse({ page: "0" })).toThrow();
    expect(() => libraryQuerySchema.parse({ limit: "99" })).toThrow();
  });
});
