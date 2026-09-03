import mongoose, { Schema, Model } from "mongoose";
import { ATTRIBUTION_SOURCES, type IOrder } from "@/types";

const OrderItemSchema = new Schema(
  {
    beatId: { type: Schema.Types.ObjectId, ref: "Beat" },
    licenseId: { type: Schema.Types.ObjectId, ref: "License" },
    licenseType: {
      type: String,
      enum: ["basic", "premium", "unlimited", "exclusive"],
    },
    price: { type: Number, required: true, min: 0 },
    beatTitle: { type: String },
    packId: { type: Schema.Types.ObjectId, ref: "BeatPack" },
    packTier: { type: String, enum: ["basic", "premium", "unlimited"] },
    packTitle: { type: String },
    kind: { type: String, enum: ["service_deposit", "service_balance"] },
    serviceJobId: { type: Schema.Types.ObjectId, ref: "ServiceJob" },
    serviceTitle: { type: String },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    buyerId: { type: Schema.Types.ObjectId, ref: "User" },
    guestEmail: { type: String },
    guestName: { type: String, maxlength: 100 },
    items: {
      type: [OrderItemSchema],
      required: true,
      validate: [
        {
          validator: (v: unknown[]) => v.length > 0,
          message: "Order must have at least one item",
        },
        {
          validator: (v: unknown[]) => v.length <= 50,
          message: "{PATH} exceeds the limit of 50",
        },
      ],
    },
    totalAmount: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    receipt: { type: String, required: true, unique: true },
    couponCode: { type: String },
    couponId: { type: Schema.Types.ObjectId, ref: "Coupon" },
    discountAmount: { type: Number, default: 0, min: 0 },
    discountPerPack: { type: Schema.Types.Mixed },
    subtotalAmount: { type: Number },
    failureReason: { type: String },
    paidAt: { type: Date },
    invoiceNumber: { type: String },
    invoicePdfKey: { type: String },
    gstBreakup: {
      type: {
        baseAmount: { type: Number, required: true },
        gstRate: { type: Number, required: true },
        gstAmount: { type: Number, required: true },
        igst: { type: Number },
        cgst: { type: Number },
        sgst: { type: Number },
      },
      _id: false,
    },
    downloadToken: { type: String },
    downloadTokenExpiry: { type: Date },
    offerId: { type: Schema.Types.ObjectId, ref: "Offer" },
    attribution: {
      type: {
        source: {
          type: String,
          enum: [...ATTRIBUTION_SOURCES],
          required: true,
        },
        beatId: { type: Schema.Types.ObjectId, ref: "Beat" },
      },
      _id: false,
    },
  },
  { timestamps: true }
);

OrderSchema.index({ buyerId: 1, status: 1 });
OrderSchema.index({ buyerId: 1, status: 1, "items.beatId": 1 });
OrderSchema.index({ buyerId: 1, status: 1, "items.packId": 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ razorpayOrderId: 1 }, { unique: true, sparse: true });
OrderSchema.index({ razorpayPaymentId: 1 }, { sparse: true });
OrderSchema.index({ invoiceNumber: 1 }, { unique: true, sparse: true });
OrderSchema.index({ guestEmail: 1, status: 1 });
OrderSchema.index({ downloadToken: 1 }, { unique: true, sparse: true });
OrderSchema.index({ "attribution.source": 1, paidAt: -1 });
OrderSchema.index({ offerId: 1, status: 1 }, { sparse: true });

const Order: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>("Order", OrderSchema);

export default Order;
