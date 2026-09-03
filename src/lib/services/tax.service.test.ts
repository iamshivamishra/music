import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IOrder, IPayout, IPurchase, IUser } from "@/types";

vi.mock("@/lib/repositories/purchase.repository", () => ({
  purchaseRepository: {
    getTaxRegister: vi.fn(),
    getTaxRegisterTotals: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/order.repository", () => ({
  orderRepository: {
    findByRazorpayOrderIds: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/payout.repository", () => ({
  payoutRepository: {
    findCompletedInRange: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/user.repository", () => ({
  userRepository: {
    findById: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/beat.repository", () => ({
  beatRepository: {
    findByIds: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/pack.repository", () => ({
  packRepository: {
    findByIds: vi.fn(),
  },
}));

vi.mock("@/lib/services/payout.service", () => ({
  payoutService: {
    getBalance: vi.fn(),
  },
}));

vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));

import { taxService } from "./tax.service";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { orderRepository } from "@/lib/repositories/order.repository";
import { payoutRepository } from "@/lib/repositories/payout.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { packRepository } from "@/lib/repositories/pack.repository";
import { payoutService } from "@/lib/services/payout.service";
import { computeGstBreakup } from "@/lib/utils/tax";

const mockedPurchases = vi.mocked(purchaseRepository);
const mockedOrders = vi.mocked(orderRepository);
const mockedPayouts = vi.mocked(payoutRepository);
const mockedUsers = vi.mocked(userRepository);
const mockedBeats = vi.mocked(beatRepository);
const mockedPacks = vi.mocked(packRepository);
const mockedBalance = vi.mocked(payoutService);

const PRODUCER_A = "64b000000000000000000001";
const PRODUCER_B = "64b000000000000000000002";

function purchase(overrides: Partial<IPurchase>): IPurchase {
  return {
    _id: "p1",
    orderId: "order_rzp_1",
    paymentId: "pay_1",
    amount: 1180,
    createdAt: new Date("2026-09-15T10:00:00.000Z"),
    updatedAt: new Date("2026-09-15T10:00:00.000Z"),
    producerId: PRODUCER_A,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedUsers.findById.mockResolvedValue({
    name: "Asha",
    displayName: "Asha Beats",
    role: "producer",
  } as IUser);
  mockedBeats.findByIds.mockResolvedValue([]);
  mockedPacks.findByIds.mockResolvedValue([]);
  mockedOrders.findByRazorpayOrderIds.mockResolvedValue([]);
  mockedPayouts.findCompletedInRange.mockResolvedValue([]);
  mockedPurchases.getTaxRegister.mockResolvedValue({ purchases: [], overflow: false });
  mockedPurchases.getTaxRegisterTotals.mockResolvedValue({ count: 0, gmv: 0 });
  mockedBalance.getBalance.mockResolvedValue({
    grossEarnings: 10_000,
    totalPayouts: 2_000,
    platformFee: 1_000,
    withdrawable: 7_000,
    feePercent: 10,
  });
});

describe("taxService.getMonthSummary", () => {
  it("returns lifetime totals without loading the sales register", async () => {
    const summary = await taxService.getMonthSummary(PRODUCER_A, 2026, 9);
    expect(summary.lifetime.withdrawable).toBe(7_000);
    expect(mockedPurchases.getTaxRegister).not.toHaveBeenCalled();
    expect(mockedOrders.findByRazorpayOrderIds).not.toHaveBeenCalled();
    expect(mockedBeats.findByIds).not.toHaveBeenCalled();
  });
});

describe("taxService.getMonthPack", () => {
  it("uses payoutService.getBalance for the lifetime snapshot", async () => {
    const pack = await taxService.getMonthPack(PRODUCER_A, 2026, 9);
    expect(pack.lifetime).toEqual({
      grossEarnings: 10_000,
      platformFee: 1_000,
      totalPayouts: 2_000,
      withdrawable: 7_000,
      feePercent: 10,
    });
    expect(mockedBalance.getBalance).toHaveBeenCalledWith(PRODUCER_A);
  });

  it("shows 0 estimated fee when founding fee percent is 0", async () => {
    mockedBalance.getBalance.mockResolvedValue({
      grossEarnings: 5_000,
      totalPayouts: 0,
      platformFee: 0,
      withdrawable: 5_000,
      feePercent: 0,
    });
    mockedPurchases.getTaxRegisterTotals.mockResolvedValue({ count: 1, gmv: 1180 });
    mockedPurchases.getTaxRegister.mockResolvedValue({
      purchases: [purchase({ amount: 1180, beatId: "b1" })],
      overflow: false,
    });
    mockedBeats.findByIds.mockResolvedValue([{ _id: "b1", title: "Midnight" }] as never);

    const pack = await taxService.getMonthPack(PRODUCER_A, 2026, 9);
    expect(pack.monthActivity.estimatedFee).toBe(0);
    expect(pack.lifetime.platformFee).toBe(0);
    expect(pack.sales[0]?.platformFeeEst).toBe(0);
  });

  it("returns empty sales and a summary for a month with zero sales", async () => {
    mockedPayouts.findCompletedInRange.mockResolvedValue([
      {
        _id: "pay1",
        producerId: PRODUCER_A,
        amount: 900,
        platformFee: 90,
        netAmount: 810,
        method: "upi",
        status: "completed",
        processedAt: new Date("2026-09-10T12:00:00.000Z"),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as IPayout,
    ]);

    const pack = await taxService.getMonthPack(PRODUCER_A, 2026, 9);
    expect(pack.sales).toEqual([]);
    expect(pack.monthActivity.salesCount).toBe(0);
    expect(pack.monthActivity.gmv).toBe(0);
    expect(pack.payouts).toHaveLength(1);
    expect(pack.payouts[0]?.netAmount).toBe(810);
    expect(pack.disclaimer.length).toBeGreaterThan(20);
  });

  it("marks guest buyers and exclusive/pack notes without leaking other producers", async () => {
    mockedPurchases.getTaxRegisterTotals.mockResolvedValue({ count: 2, gmv: 2360 });
    mockedPurchases.getTaxRegister.mockResolvedValue({
      purchases: [
        purchase({
          _id: "g1",
          guestEmail: "guest@example.com",
          amount: 1180,
          licenseType: "exclusive",
          beatId: "b1",
        }),
        purchase({
          _id: "pk1",
          amount: 1180,
          packId: "pack1",
          sourceType: "pack",
          packTier: "premium",
          orderId: "order_rzp_2",
        }),
      ],
      overflow: false,
    });
    mockedBeats.findByIds.mockResolvedValue([{ _id: "b1", title: "Midnight" }] as never);
    mockedPacks.findByIds.mockResolvedValue([{ _id: "pack1", title: "Desi Pack" }] as never);
    mockedOrders.findByRazorpayOrderIds.mockResolvedValue([
      {
        razorpayOrderId: "order_rzp_1",
        invoiceNumber: "INV-2026-0001",
        couponCode: "SAVE10",
        status: "paid",
        gstBreakup: { baseAmount: 1000, gstRate: 18, gstAmount: 180, igst: 180 },
      } as IOrder,
    ]);

    const pack = await taxService.getMonthPack(PRODUCER_A, 2026, 9);

    expect(mockedPurchases.getTaxRegister).toHaveBeenCalledWith(
      PRODUCER_A,
      expect.any(Date),
      expect.any(Date),
      10_000
    );
    expect(mockedPurchases.getTaxRegister).not.toHaveBeenCalledWith(
      PRODUCER_B,
      expect.anything(),
      expect.anything(),
      expect.anything()
    );

    const guestRow = pack.sales.find((row) => row.buyerType === "guest");
    expect(guestRow?.beatOrPack).toBe("Midnight");
    expect(guestRow?.notes).toContain("exclusive");
    expect(guestRow?.notes).toContain("coupon:SAVE10");
    expect(guestRow?.invoiceNumber).toBe("INV-2026-0001");

    const packRow = pack.sales.find((row) => row.beatOrPack === "Desi Pack");
    expect(packRow?.notes).toContain("pack");
    expect(packRow?.licenseType).toBe("premium");

    const gst = computeGstBreakup(1180);
    expect(guestRow?.taxableValue).toBe(gst.baseAmount);
    expect(guestRow?.gstAmount).toBe(gst.gstAmount);
  });
});
