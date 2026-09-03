import mongoose, { Schema, type Model } from "mongoose";
import type { IEarning } from "@/types";

const EarningSchema = new Schema<IEarning>(
  {
    purchaseId: { type: Schema.Types.ObjectId, ref: "Purchase", required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    beatId: { type: Schema.Types.ObjectId, ref: "Beat" },
    packId: { type: Schema.Types.ObjectId, ref: "BeatPack" },
    producerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    grossAmount: { type: Number, required: true, min: 0 },
    sharePercent: { type: Number, required: true, min: 1, max: 100 },
  },
  { timestamps: true }
);

EarningSchema.index({ producerId: 1, createdAt: -1 });
EarningSchema.index({ purchaseId: 1, producerId: 1 }, { unique: true });
EarningSchema.index({ beatId: 1 });

const Earning: Model<IEarning> =
  mongoose.models.Earning || mongoose.model<IEarning>("Earning", EarningSchema);

export default Earning;
