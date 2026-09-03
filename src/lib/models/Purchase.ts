import mongoose, { Schema, Model } from "mongoose";
import type { IPurchase } from "@/types";

const PurchaseSchema = new Schema<IPurchase>(
  {
    buyerId: { type: Schema.Types.ObjectId, ref: "User" },
    guestEmail: { type: String },
    producerId: { type: Schema.Types.ObjectId, ref: "User" },
    beatId: { type: Schema.Types.ObjectId, ref: "Beat" },
    licenseId: { type: Schema.Types.ObjectId, ref: "License" },
    licenseType: { type: String, enum: ["basic", "premium", "unlimited", "exclusive"] },
    includesWav: { type: Boolean, default: false },
    includesStems: { type: Boolean, default: false },
    packId: { type: Schema.Types.ObjectId, ref: "BeatPack" },
    packTier: { type: String, enum: ["basic", "premium", "unlimited"] },
    sourceType: { type: String, enum: ["individual", "pack"], default: "individual" },
    sourcePackId: { type: Schema.Types.ObjectId, ref: "BeatPack" },
    orderId: { type: String, required: true },
    paymentId: { type: String, required: true },
    amount: { type: Number, required: true },
    licenseNumber: { type: String },
    licensePdfKey: { type: String },
    verificationHash: { type: String },
    offerId: { type: Schema.Types.ObjectId, ref: "Offer" },
    licenseSnapshot: {
      type: new Schema(
        {
          name: { type: String },
          includesWav: { type: Boolean },
          includesStems: { type: Boolean },
          commercialUse: { type: Boolean },
          streamLimit: { type: Number },
          terms: { type: String },
        },
        { _id: false }
      ),
    },
  },
  { timestamps: true }
);

PurchaseSchema.index({ buyerId: 1, beatId: 1 }, { unique: true, partialFilterExpression: { beatId: { $exists: true }, buyerId: { $exists: true } } });
PurchaseSchema.index({ buyerId: 1, packId: 1 }, { unique: true, partialFilterExpression: { packId: { $exists: true }, buyerId: { $exists: true } } });
PurchaseSchema.index({ buyerId: 1 });
PurchaseSchema.index({ buyerId: 1, createdAt: -1 });
PurchaseSchema.index({ beatId: 1 });
PurchaseSchema.index({ createdAt: -1, beatId: 1 });
PurchaseSchema.index({ producerId: 1 });
PurchaseSchema.index({ producerId: 1, createdAt: -1 });
PurchaseSchema.index({ orderId: 1 });
PurchaseSchema.index({ paymentId: 1 });
PurchaseSchema.index({ licenseNumber: 1 }, { unique: true, sparse: true });
PurchaseSchema.index({ verificationHash: 1 }, { unique: true, sparse: true });
PurchaseSchema.index({ guestEmail: 1 });
PurchaseSchema.index({ licenseId: 1 });
PurchaseSchema.index({ guestEmail: 1, beatId: 1 }, { unique: true, partialFilterExpression: { guestEmail: { $exists: true }, beatId: { $exists: true } } });
PurchaseSchema.index({ buyerId: 1, orderId: 1 });
PurchaseSchema.index({ offerId: 1 }, { sparse: true });

const Purchase: Model<IPurchase> =
  mongoose.models.Purchase || mongoose.model<IPurchase>("Purchase", PurchaseSchema);

export default Purchase;
