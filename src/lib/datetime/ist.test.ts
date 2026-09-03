import { describe, expect, it } from "vitest";
import { istDatetimeLocalToUtc, utcToIstDatetimeLocal } from "./ist";

describe("IST datetime-local conversion", () => {
  it("converts an IST local value to the matching UTC instant", () => {
    const utc = istDatetimeLocalToUtc("2026-09-04T18:30");
    expect(utc.toISOString()).toBe("2026-09-04T13:00:00.000Z");
  });

  it("round-trips through datetime-local in IST", () => {
    const source = new Date("2026-09-04T13:00:00.000Z");
    const local = utcToIstDatetimeLocal(source);
    expect(local).toBe("2026-09-04T18:30");
    expect(istDatetimeLocalToUtc(local).toISOString()).toBe(source.toISOString());
  });
});
