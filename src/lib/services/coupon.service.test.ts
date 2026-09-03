import { beforeEach, describe, expect, it, vi } from "vitest";
import { ValidationError } from "@/lib/errors";
import type { ICoupon } from "@/types";

vi.mock("@/lib/repositories/coupon.repository", () => ({
  couponRepository: {
    findByCode: vi.fn(),
    findById: vi.fn(),
    findByProducerPaginated: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    incrementUsageIfAllowed: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/coupon-usage.repository", () => ({
  couponUsageRepository: {
    create: vi.fn(),
    countByUserAndCoupon: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/pack.repository", () => ({
  packRepository: {
    findById: vi.fn(),
    findByIds: vi.fn(),
  },
}));

vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { couponService } from "./coupon.service";
import { couponRepository } from "@/lib/repositories/coupon.repository";
import { couponUsageRepository } from "@/lib/repositories/coupon-usage.repository";
import { packRepository } from "@/lib/repositories/pack.repository";

const mockedCouponRepo = vi.mocked(couponRepository);
const mockedPackRepo = vi.mocked(packRepository);

function makeCoupon(overrides: Partial<ICoupon> = {}): ICoupon {
  return {
    _id: "coupon1",
    code: "SAVE20",
    producerId: "producer1",
    type: "percent",
    value: 20,
    packIds: [],
    emailRestrictions: [],
    status: "active",
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("couponService.validateCoupon", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a percentage discount for an active coupon", async () => {
    mockedCouponRepo.findByCode.mockResolvedValue(makeCoupon());

    const result = await couponService.validateCoupon(
      "SAVE20",
      "user1",
      "buyer@example.com",
      ["pack1"],
      { pack1: 1000 }
    );

    expect(result.totalDiscount).toBe(200);
    expect(result.discountPerPack.pack1).toBe(200);
  });

  it("caps percentage discounts at maxDiscount", async () => {
    mockedCouponRepo.findByCode.mockResolvedValue(makeCoupon({ maxDiscount: 50 }));

    const result = await couponService.validateCoupon(
      "SAVE20",
      "user1",
      "buyer@example.com",
      ["pack1"],
      { pack1: 1000 }
    );

    expect(result.totalDiscount).toBe(50);
  });

  it("rejects draft coupons", async () => {
    mockedCouponRepo.findByCode.mockResolvedValue(makeCoupon({ status: "draft" }));

    await expect(
      couponService.validateCoupon("SAVE20", "user1", "a@b.com", ["pack1"], { pack1: 500 })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects expired coupons", async () => {
    mockedCouponRepo.findByCode.mockResolvedValue(
      makeCoupon({ expiresAt: new Date(Date.now() - 1000) })
    );

    await expect(
      couponService.validateCoupon("SAVE20", "user1", "a@b.com", ["pack1"], { pack1: 500 })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects exhausted coupons", async () => {
    mockedCouponRepo.findByCode.mockResolvedValue(
      makeCoupon({ usageLimit: 1, usageCount: 1 })
    );

    await expect(
      couponService.validateCoupon("SAVE20", "user1", "a@b.com", ["pack1"], { pack1: 500 })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects when the buyer has already used the coupon", async () => {
    mockedCouponRepo.findByCode.mockResolvedValue(makeCoupon({ maxUsesPerUser: 1 }));
    vi.mocked(couponUsageRepository.countByUserAndCoupon).mockResolvedValue(1);

    await expect(
      couponService.validateCoupon("SAVE20", "user1", "a@b.com", ["pack1"], { pack1: 500 })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects when no cart packs are in the allowlist", async () => {
    mockedCouponRepo.findByCode.mockResolvedValue(makeCoupon({ packIds: ["pack-other"] }));

    await expect(
      couponService.validateCoupon("SAVE20", "user1", "a@b.com", ["pack1"], { pack1: 500 })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("resolves pack prices from Music tiers in validateFromCart", async () => {
    mockedCouponRepo.findByCode.mockResolvedValue(makeCoupon());
    mockedPackRepo.findByIds.mockResolvedValue([
      {
        _id: "pack1",
        tiers: [
          { type: "basic", price: 499, isActive: true },
          { type: "premium", price: 999, isActive: true },
        ],
      },
    ] as never);

    const result = await couponService.validateFromCart(
      "SAVE20",
      "user1",
      "buyer@example.com",
      ["pack1"],
      { pack1: "premium" }
    );

    expect(result.totalDiscount).toBe(200);
    expect(result.discountPerPack.pack1).toBe(200);
  });
});
