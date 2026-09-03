import { describe, expect, it } from "vitest";
import { fillMonthlyRevenue, toProducerSaleRow } from "./earning";

describe("toProducerSaleRow", () => {
  it("marks collab sales when the catalog owner differs", () => {
    const row = toProducerSaleRow(
      {
        purchaseId: "p1",
        beatTitle: null,
        beatId: "b1",
        licenseType: "basic",
        amount: 999,
        shareAmount: 300,
        sharePercent: 30,
        ownerProducerId: "owner_1",
        buyerName: null,
        createdAt: new Date("2026-01-01"),
      },
      "collab_1"
    );

    expect(row.isCollab).toBe(true);
    expect(row.beatTitle).toBe("Pack Purchase");
    expect(row.buyerName).toBe("");
  });
});

describe("fillMonthlyRevenue", () => {
  it("pads missing months and keeps existing revenue", () => {
    const now = new Date();
    const filled = fillMonthlyRevenue(
      [
        {
          year: now.getFullYear(),
          month: now.getMonth() + 1,
          revenue: 500,
          sales: 2,
        },
      ],
      3
    );

    expect(filled).toHaveLength(3);
    expect(filled[2].revenue).toBe(500);
    expect(filled[2].sales).toBe(2);
    expect(filled[0].revenue).toBe(0);
  });
});
