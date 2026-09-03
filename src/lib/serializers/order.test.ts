import { describe, expect, it } from "vitest";
import { toCheckoutOrderDto } from "@/lib/serializers/order";
import type { IOrder } from "@/types";

function order(overrides: Partial<IOrder> = {}): IOrder {
  return {
    _id: "507f1f77bcf86cd799439011",
    buyerId: "buyer_1",
    receipt: "rcpt_1",
    status: "paid",
    totalAmount: 800,
    subtotalAmount: 1000,
    discountAmount: 200,
    couponCode: "SAVE20",
    items: [
      { beatTitle: "Night Drive", licenseType: "basic", price: 499, beatId: "b1" },
      { packTitle: "Trap Pack", packTier: "premium", price: 501, packId: "p1" },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as IOrder;
}

describe("toCheckoutOrderDto", () => {
  it("maps order ids, amounts, and item kinds for the success page", () => {
    const dto = toCheckoutOrderDto(order());

    expect(dto.id).toBe("507f1f77bcf86cd799439011");
    expect(dto.receipt).toBe("rcpt_1");
    expect(dto.discountAmount).toBe(200);
    expect(dto.couponCode).toBe("SAVE20");
    expect(dto.items).toEqual([
      { kind: "beat", title: "Night Drive", tier: "basic", price: 499 },
      { kind: "pack", title: "Trap Pack", tier: "premium", price: 501 },
    ]);
  });

  it("maps service deposit and balance lines", () => {
    const dto = toCheckoutOrderDto(
      order({
        items: [
          {
            kind: "service_deposit",
            serviceTitle: "Custom trap beat",
            serviceJobId: "job1",
            price: 2500,
          },
        ],
      })
    );
    expect(dto.items).toEqual([
      {
        kind: "service",
        title: "Custom trap beat",
        tier: "Deposit",
        price: 2500,
        serviceJobId: "job1",
      },
    ]);
  });
});
