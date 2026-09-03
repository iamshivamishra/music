import mongoose, { Schema, Model } from "mongoose";
import type { ICartItem } from "@/types";

const CartItemSchema = new Schema<ICartItem>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    beatId: { type: Schema.Types.ObjectId, ref: "Beat" },
    licenseId: { type: Schema.Types.ObjectId, ref: "License" },
    packId: { type: Schema.Types.ObjectId, ref: "BeatPack" },
    packTier: { type: String, enum: ["basic", "premium", "unlimited"] },
    addedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

CartItemSchema.index({ userId: 1 });
CartItemSchema.index({ userId: 1, beatId: 1 }, { unique: true, partialFilterExpression: { beatId: { $exists: true } } });
CartItemSchema.index({ userId: 1, packId: 1 }, { unique: true, sparse: true });

const CartItem: Model<ICartItem> =
  mongoose.models.CartItem || mongoose.model<ICartItem>("CartItem", CartItemSchema);

export default CartItem;
