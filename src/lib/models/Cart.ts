import mongoose, { Schema, Model } from "mongoose";
import type { ICartItem } from "@/types";

const CartItemSchema = new Schema<ICartItem>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    beatId: { type: Schema.Types.ObjectId, ref: "Beat", required: true },
    licenseId: { type: Schema.Types.ObjectId, ref: "License", required: true },
    addedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

CartItemSchema.index({ userId: 1 });
CartItemSchema.index({ userId: 1, beatId: 1 }, { unique: true });

const CartItem: Model<ICartItem> =
  mongoose.models.CartItem || mongoose.model<ICartItem>("CartItem", CartItemSchema);

export default CartItem;
