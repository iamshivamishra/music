import mongoose, { Schema, type Model } from "mongoose";
import type { IWaitlist } from "@/types";

const WaitlistSchema = new Schema<IWaitlist>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ["producer"],
      default: "producer",
    },
    genres: [{ type: String, trim: true }],
    socialLinks: { type: String },
    status: {
      type: String,
      enum: ["pending", "invited", "joined"],
      default: "pending",
    },
    invitedAt: { type: Date },
    joinedAt: { type: Date },
  },
  { timestamps: true }
);

WaitlistSchema.index({ status: 1 });

const Waitlist: Model<IWaitlist> =
  mongoose.models.Waitlist ||
  mongoose.model<IWaitlist>("Waitlist", WaitlistSchema);

export default Waitlist;
