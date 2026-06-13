import mongoose, { Schema, Model } from "mongoose";
import { IPurchase } from "@/types";

const PurchaseSchema = new Schema<IPurchase>(
  {
    userId: { type: String, required: true },
    songId: { type: String, required: true },
    orderId: { type: String, required: true },
    paymentId: { type: String, required: true },
    amount: { type: Number, required: true },
  },
  { timestamps: true }
);

// Ek user ek song ek baar hi khareed sakta hai
PurchaseSchema.index({ userId: 1, songId: 1 }, { unique: true });

const Purchase: Model<IPurchase> =
  mongoose.models.Purchase ||
  mongoose.model<IPurchase>("Purchase", PurchaseSchema);

export default Purchase;