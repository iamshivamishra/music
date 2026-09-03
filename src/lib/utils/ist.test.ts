import { describe, expect, it } from "vitest";
import { formatIstDateTime, istMonthRange } from "./ist";

describe("istMonthRange", () => {
  it("includes a sale at 23:30 IST on the last day of the month", () => {
    const { from, to } = istMonthRange(2026, 9);
    const lastDayNight = new Date("2026-09-30T23:30:00+05:30");
    expect(lastDayNight.getTime()).toBeGreaterThanOrEqual(from.getTime());
    expect(lastDayNight.getTime()).toBeLessThan(to.getTime());
  });

  it("excludes a sale at 00:30 IST on the first day of the next month", () => {
    const { from, to } = istMonthRange(2026, 9);
    const nextMorning = new Date("2026-10-01T00:30:00+05:30");
    expect(nextMorning.getTime()).toBeGreaterThanOrEqual(to.getTime());
    expect(nextMorning.getTime()).toBeGreaterThanOrEqual(from.getTime());
  });

  it("uses IST midnight bounds in UTC", () => {
    const { from, to } = istMonthRange(2026, 9);
    expect(from.toISOString()).toBe("2026-08-31T18:30:00.000Z");
    expect(to.toISOString()).toBe("2026-09-30T18:30:00.000Z");
  });
});

describe("formatIstDateTime", () => {
  it("formats in Asia/Kolkata", () => {
    const formatted = formatIstDateTime(new Date("2026-09-30T18:00:00.000Z"));
    expect(formatted).toMatch(/30/);
    expect(formatted).toMatch(/09/);
    expect(formatted).toMatch(/2026/);
  });
});
