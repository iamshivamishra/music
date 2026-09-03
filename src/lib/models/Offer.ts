import mongoose, { Schema, type Model } from "mongoose";
import type { IOffer } from "@/types";

const LicenseSnapshotSchema = new Schema(
  {
    name: { type: String, required: true },
    includesWav: { type: Boolean, required: true },
    includesStems: { type: Boolean, required: true },
    commercialUse: { type: Boolean, required: true },
    streamLimit: { type: Number, required: true },
    terms: { type: String, required: true },
  },
  { _id: false }
);

const OfferSchema = new Schema<IOffer>(
  {
    producerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    beatId: { type: Schema.Types.ObjectId, ref: "Beat", required: true },
    token: { type: String },
    status: {
      type: String,
      enum: ["pending_request", "open", "accepted", "expired", "withdrawn"],
      required: true,
    },
    requestedByUserId: { type: Schema.Types.ObjectId, ref: "User" },
    requesterEmail: { type: String, lowercase: true, trim: true },
    requesterNote: { type: String, maxlength: 500 },
    licenseType: {
      type: String,
      enum: ["basic", "premium", "unlimited", "exclusive"],
    },
    licenseSnapshot: { type: LicenseSnapshotSchema },
    amount: { type: Number, min: 100, max: 500_000 },
    expiresAt: { type: Date },
    acceptedOrderId: { type: Schema.Types.ObjectId, ref: "Order" },
    acceptedPurchaseId: { type: Schema.Types.ObjectId, ref: "Purchase" },
  },
  { timestamps: true }
);

OfferSchema.index({ token: 1 }, { unique: true, sparse: true });
OfferSchema.index({ producerId: 1, status: 1, createdAt: -1 });
OfferSchema.index({ beatId: 1, status: 1 });
OfferSchema.index({ expiresAt: 1 });

const Offer: Model<IOffer> =
  mongoose.models.Offer || mongoose.model<IOffer>("Offer", OfferSchema);

export default Offer;
