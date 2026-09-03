import mongoose, { Schema, type Model } from "mongoose";
import type { IPayout } from "@/types";

const PayoutSchema = new Schema<IPayout>(
  {
    producerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 1 },
    platformFee: { type: Number, required: true, min: 0 },
    netAmount: { type: Number, required: true, min: 1 },
    method: { type: String, enum: ["upi", "bank_transfer"], required: true },
    upiId: { type: String },
    bankDetails: {
      accountNumber: { type: String },
      ifsc: { type: String },
      accountName: { type: String },
    },
    status: {
      type: String,
      enum: ["requested", "processing", "completed", "failed"],
      default: "requested",
    },
    razorpayPayoutId: { type: String },
    razorpayFundAccountId: { type: String },
    failureReason: { type: String },
    processedAt: { type: Date },
  },
  { timestamps: true }
);

PayoutSchema.index({ producerId: 1, status: 1 });
PayoutSchema.index({ producerId: 1, processedAt: 1 });
PayoutSchema.index({ status: 1, createdAt: -1 });
PayoutSchema.index({ razorpayPayoutId: 1 }, { unique: true, sparse: true });

const Payout: Model<IPayout> =
  mongoose.models.Payout || mongoose.model<IPayout>("Payout", PayoutSchema);

export default Payout;
