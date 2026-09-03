import { describe, expect, it } from "vitest";
import { embedCatalogQuerySchema } from "./embed";

describe("embedCatalogQuerySchema", () => {
  it("defaults limit to 10", () => {
    expect(embedCatalogQuerySchema.parse({})).toEqual({ limit: 10 });
  });

  it("coerces and clamps via max", () => {
    expect(embedCatalogQuerySchema.parse({ limit: "7" })).toEqual({ limit: 7 });
    expect(() => embedCatalogQuerySchema.parse({ limit: "99" })).toThrow();
  });
});
