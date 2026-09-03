import { describe, expect, it } from "vitest";
import { toLeadsCsv, toStudioLeadRow } from "./lead";
import type { ILead } from "@/types";

describe("toLeadsCsv", () => {
  it("escapes commas and includes the privacy footer", () => {
    const csv = toLeadsCsv([
      {
        id: "1",
        beatId: "b1",
        beatTitle: "Night, Drive",
        email: "a@b.com",
        whatsappNumber: null,
        source: "free_download",
        createdAt: "2026-09-03T00:00:00.000Z",
      },
    ]);
    expect(csv).toContain('"Night, Drive"');
    expect(csv).toContain("Do not buy third-party lists.");
  });
});

describe("toStudioLeadRow", () => {
  it("nulls missing identity fields", () => {
    const row = toStudioLeadRow(
      {
        _id: "lead_1",
        producerId: "p1",
        beatId: "b1",
        source: "free_download",
        consentAt: new Date(),
        createdAt: new Date("2026-09-03T00:00:00.000Z"),
        updatedAt: new Date(),
      } as ILead,
      "Night Drive"
    );
    expect(row.email).toBeNull();
    expect(row.whatsappNumber).toBeNull();
    expect(row.beatTitle).toBe("Night Drive");
  });
});
