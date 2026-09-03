import type { Types } from "mongoose";

export type CouponStatus = "draft" | "active" | "paused" | "scheduled" | "expired" | "exhausted";
export type CouponType = "flat" | "percent";

export interface ICoupon {
  _id: string | Types.ObjectId;
  code: string;
  producerId: string | Types.ObjectId;
  type: CouponType;
  value: number;
  maxDiscount?: number;
  minOrderAmount?: number;
  status: CouponStatus;
  scheduledAt?: Date;
  expiresAt?: Date;
  usageLimit?: number;
  usageCount: number;
  maxUsesPerUser?: number;
  packIds: Array<string | Types.ObjectId>;
  emailRestrictions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ICouponUsage {
  _id: string | Types.ObjectId;
  couponId: string | Types.ObjectId;
  userId: string | Types.ObjectId;
  orderId: string;
  packId: string | Types.ObjectId;
  discount: number;
  usedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
