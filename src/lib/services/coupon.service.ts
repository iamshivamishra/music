import { couponRepository } from "@/lib/repositories/coupon.repository";
import { couponUsageRepository } from "@/lib/repositories/coupon-usage.repository";
import { packRepository } from "@/lib/repositories/pack.repository";
import { findActiveTierWithFallback } from "@/lib/utils/pack-helpers";
import { NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";
import { audit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import type { ClientSession } from "mongoose";
import type { ICoupon, ICouponUsage, CouponStatus, LicenseType, PaginatedResult } from "@/types";
import type { CreateCouponInput, UpdateCouponInput } from "@/lib/validators/coupon";

export interface CouponValidationResult {
  coupon: ICoupon;
  discountPerPack: Record<string, number>;
  totalDiscount: number;
}

function deriveCouponStatus(coupon: ICoupon): CouponStatus {
  if (coupon.status === "draft") return "draft";
  if (coupon.status === "paused") return "paused";
  const now = new Date();
  if (coupon.status === "scheduled" || (coupon.scheduledAt && now < new Date(coupon.scheduledAt))) {
    if (coupon.scheduledAt && now < new Date(coupon.scheduledAt)) return "scheduled";
  }
  if (coupon.expiresAt && now > new Date(coupon.expiresAt)) return "expired";
  if (coupon.usageLimit && coupon.usageLimit > 0 && coupon.usageCount >= coupon.usageLimit) {
    return "exhausted";
  }
  if (coupon.status === "active") return "active";
  return coupon.status;
}

function computeDiscount(coupon: ICoupon, packPrice: number): number {
  let discount: number;
  if (coupon.type === "percent") {
    discount = Math.round((packPrice * coupon.value) / 100);
  } else {
    discount = Math.min(coupon.value, packPrice);
  }

  if (coupon.maxDiscount && discount > coupon.maxDiscount) {
    discount = coupon.maxDiscount;
  }

  return Math.max(0, discount);
}

export const couponService = {
  async list(
    producerId: string,
    status?: CouponStatus,
    page?: number,
    limit?: number
  ): Promise<PaginatedResult<ICoupon>> {
    return couponRepository.findByProducerPaginated(producerId, status, page, limit);
  },

  async create(producerId: string, input: CreateCouponInput): Promise<ICoupon> {
    const existing = await couponRepository.findByCode(input.code);
    if (existing) {
      throw new ValidationError("Validation failed", {
        code: ["A coupon with this code already exists"],
      });
    }

    if (input.type === "percent" && input.value > 100) {
      throw new ValidationError("Validation failed", {
        value: ["Percentage discount cannot exceed 100%"],
      });
    }

    const coupon = await couponRepository.create({
      ...input,
      code: input.code.toUpperCase(),
      producerId,
      usageCount: 0,
    });

    audit({ action: "admin.action", metadata: { event: "coupon.created", couponId: coupon._id, producerId, code: coupon.code } });
    return coupon;
  },

  async update(
    couponId: string,
    producerId: string,
    input: UpdateCouponInput
  ): Promise<ICoupon> {
    const coupon = await couponRepository.findById(couponId);
    if (!coupon) throw new NotFoundError("Coupon");
    if (coupon.producerId.toString() !== producerId) {
      throw new ForbiddenError("You can only edit your own coupons");
    }

    if (input.type === "percent" && (input.value ?? coupon.value) > 100) {
      throw new ValidationError("Validation failed", {
        value: ["Percentage discount cannot exceed 100%"],
      });
    }

    const updated = await couponRepository.update(couponId, input);
    if (!updated) throw new NotFoundError("Coupon");

    audit({ action: "admin.action", metadata: { event: "coupon.updated", couponId, producerId } });
    return updated;
  },

  async delete(couponId: string, producerId: string): Promise<void> {
    const coupon = await couponRepository.findById(couponId);
    if (!coupon) throw new NotFoundError("Coupon");
    if (coupon.producerId.toString() !== producerId) {
      throw new ForbiddenError("You can only delete your own coupons");
    }

    await couponRepository.delete(couponId);
    audit({ action: "admin.action", metadata: { event: "coupon.deleted", couponId, producerId, code: coupon.code } });
  },

  /**
   * Validate a coupon code for a buyer against pack prices.
   * Coupons apply to pack items only.
   */
  async validateCoupon(
    code: string,
    userId: string,
    userEmail: string,
    packIds: string[],
    packPrices: Record<string, number>
  ): Promise<CouponValidationResult> {
    const coupon = await couponRepository.findByCode(code);
    if (!coupon) {
      throw new ValidationError("Invalid coupon code", {
        code: ["Coupon not found"],
      });
    }

    const status = deriveCouponStatus(coupon);
    if (status !== "active") {
      const messages: Record<string, string> = {
        draft: "This coupon is not yet published",
        paused: "This coupon is currently paused",
        scheduled: "This coupon is not yet active",
        expired: "This coupon has expired",
        exhausted: "This coupon has been fully redeemed",
      };
      throw new ValidationError(messages[status] ?? "Coupon unavailable", {
        code: [messages[status] ?? "Coupon unavailable"],
      });
    }

    if (coupon.maxUsesPerUser && coupon.maxUsesPerUser > 0) {
      const userUsage = await couponUsageRepository.countByUserAndCoupon(
        userId,
        coupon._id.toString()
      );
      if (userUsage >= coupon.maxUsesPerUser) {
        throw new ValidationError("You have already used this coupon", {
          code: ["Per-user usage limit reached"],
        });
      }
    }

    if (coupon.emailRestrictions.length > 0) {
      const allowed = coupon.emailRestrictions.some(
        (email) => email.toLowerCase() === userEmail.toLowerCase()
      );
      if (!allowed) {
        throw new ValidationError("This coupon is not available for your account", {
          code: ["Not eligible for this coupon"],
        });
      }
    }

    const applicablePackIds =
      coupon.packIds.length > 0
        ? packIds.filter((pid) => coupon.packIds.some((ap) => ap.toString() === pid))
        : packIds;

    if (applicablePackIds.length === 0) {
      throw new ValidationError("This coupon doesn't apply to any items in your cart", {
        code: ["No applicable packs"],
      });
    }

    const discountPerPack: Record<string, number> = {};
    let totalDiscount = 0;
    for (const packId of applicablePackIds) {
      const price = packPrices[packId] ?? 0;
      const discount = computeDiscount(coupon, price);
      discountPerPack[packId] = discount;
      totalDiscount += discount;
    }

    if (coupon.minOrderAmount) {
      const packSubtotal = Object.values(packPrices).reduce((sum, price) => sum + price, 0);
      if (packSubtotal < coupon.minOrderAmount) {
        throw new ValidationError(`Minimum order amount is ₹${coupon.minOrderAmount}`, {
          code: [`Order must be at least ₹${coupon.minOrderAmount}`],
        });
      }
    }

    return { coupon, discountPerPack, totalDiscount };
  },

  async validateFromCart(
    code: string,
    userId: string,
    userEmail: string,
    packIds: string[],
    tiers: Record<string, string> = {}
  ): Promise<CouponValidationResult> {
    // Batch-load all packs in one query (avoids N+1)
    const packs = await packRepository.findByIds(packIds);
    const packMap = new Map(packs.map((p) => [p._id.toString(), p]));

    const packPrices: Record<string, number> = {};
    for (const packId of packIds) {
      const pack = packMap.get(packId);
      if (!pack) continue;
      const requestedTier = (tiers[packId] ?? "basic") as LicenseType;
      const tier = findActiveTierWithFallback(pack, requestedTier);
      if (tier) packPrices[packId] = tier.price;
    }
    return this.validateCoupon(code, userId, userEmail, packIds, packPrices);
  },

  async recordUsage(
    couponId: string,
    userId: string,
    orderId: string,
    packIds: string[],
    discountPerPack: Record<string, number>,
    options: { session?: ClientSession } = {}
  ): Promise<void> {
    const coupon = await couponRepository.findById(couponId, options);
    const incremented = await couponRepository.incrementUsageIfAllowed(
      couponId,
      coupon?.usageLimit,
      options
    );
    if (!incremented) {
      logger.warn("Coupon usage increment rejected (exhausted or inactive)", {
        couponId,
        orderId,
      });
      return;
    }

    const applicablePacks = packIds.filter((packId) => (discountPerPack[packId] ?? 0) > 0);
    for (const packId of applicablePacks) {
      try {
        await couponUsageRepository.create(
          {
            couponId: couponId as unknown as ICouponUsage["couponId"],
            userId: userId as unknown as ICouponUsage["userId"],
            orderId,
            packId: packId as unknown as ICouponUsage["packId"],
            discount: discountPerPack[packId],
          },
          options
        );
      } catch (error) {
        const mongoError = error as { code?: number };
        if (mongoError.code === 11000) {
          logger.info("Duplicate coupon usage record skipped", {
            couponId,
            orderId,
            packId,
          });
          continue;
        }
        throw error;
      }
    }

    const totalDiscount = Object.values(discountPerPack).reduce((sum, value) => sum + value, 0);
    audit({
      action: "coupon.applied",
      userId,
      resourceType: "coupon",
      resourceId: couponId,
      metadata: { orderId, totalDiscount, packCount: packIds.length },
    });
  },
};
