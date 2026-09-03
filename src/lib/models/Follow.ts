import mongoose, { Schema, models, model } from "mongoose";
import type { IFollow } from "@/types";

const FollowSchema = new Schema<IFollow>(
  {
    follower: { type: Schema.Types.ObjectId, ref: "User", required: true },
    following: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

FollowSchema.index({ follower: 1, following: 1 }, { unique: true });
FollowSchema.index({ following: 1 });

const Follow: mongoose.Model<IFollow> =
  models.Follow || model<IFollow>("Follow", FollowSchema);

export default Follow;
