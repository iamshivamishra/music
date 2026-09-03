import mongoose, { Schema, type Model } from "mongoose";
import type { ILike } from "@/types";

const LikeSchema = new Schema<ILike>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    beatId: { type: Schema.Types.ObjectId, ref: "Beat", required: true },
  },
  { timestamps: true }
);

LikeSchema.index({ userId: 1, beatId: 1 }, { unique: true });
LikeSchema.index({ beatId: 1, createdAt: -1 });

const Like: Model<ILike> =
  mongoose.models.Like || mongoose.model<ILike>("Like", LikeSchema);

export default Like;
