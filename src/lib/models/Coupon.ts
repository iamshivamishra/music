import mongoose, { Schema, type Model } from "mongoose";
import type { ICoupon } from "@/types";

const CouponSchema = new Schema<ICoupon>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    producerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["flat", "percent"],
      required: true,
    },
    value: { type: Number, required: true, min: 0 },
    maxDiscount: { type: Number, min: 0 },
    minOrderAmount: { type: Number, min: 0 },
    status: {
      type: String,
      enum: ["draft", "active", "paused", "scheduled", "expired", "exhausted"],
      required: true,
      default: "draft",
    },
    scheduledAt: { type: Date },
    expiresAt: { type: Date },
    usageLimit: { type: Number, min: 1 },
    usageCount: { type: Number, default: 0 },
    maxUsesPerUser: { type: Number, default: 0, min: 0 },
    packIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "BeatPack" }],
      validate: [(v: unknown[]) => v.length <= 50, "{PATH} exceeds the limit of 50"],
    },
    emailRestrictions: {
      type: [{ type: String, lowercase: true, trim: true }],
      validate: [(v: unknown[]) => v.length <= 100, "{PATH} exceeds the limit of 100"],
    },
  },
  { timestamps: true }
);

CouponSchema.index({ producerId: 1, status: 1 });
CouponSchema.index({ expiresAt: 1 }, { sparse: true });

const Coupon: Model<ICoupon> =
  mongoose.models.Coupon || mongoose.model<ICoupon>("Coupon", CouponSchema);

export default Coupon;
