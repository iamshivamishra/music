import mongoose, { Schema, type Model } from "mongoose";
import type { IBeatPack } from "@/types";

const PackBeatEntrySchema = new Schema(
  {
    beatId: { type: Schema.Types.ObjectId, ref: "Beat", required: true },
    position: { type: Number, required: true },
  },
  { _id: false }
);

const PackTierSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["basic", "premium", "unlimited"],
      required: true,
    },
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 1 },
    includesWav: { type: Boolean, default: false },
    includesStems: { type: Boolean, default: false },
    commercialUse: { type: Boolean, default: false },
    streamLimit: { type: Number, default: 0 },
    terms: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

const BeatPackSchema = new Schema<IBeatPack>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true, maxlength: 2000 },
    producerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    beats: {
      type: [PackBeatEntrySchema],
      default: [],
      validate: [(v: unknown[]) => v.length <= 50, "{PATH} exceeds the limit of 50"],
    },
    coverImages: { type: [String], default: [] },
    tiers: {
      type: [PackTierSchema],
      default: [],
      validate: [(v: unknown[]) => v.length <= 10, "{PATH} exceeds the limit of 10"],
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    isPublished: { type: Boolean, default: false },
    salesCount: { type: Number, default: 0 },
    tags: [{ type: String, trim: true }],
    genre: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

BeatPackSchema.pre("save", function (next) {
  this.isPublished = this.status === "published";
  next();
});

BeatPackSchema.index({ producerId: 1, status: 1 });
BeatPackSchema.index({ genre: 1, isPublished: 1 });
BeatPackSchema.index({ createdAt: -1 });
BeatPackSchema.index({ title: "text", tags: "text" });

const BeatPack: Model<IBeatPack> =
  mongoose.models.BeatPack || mongoose.model<IBeatPack>("BeatPack", BeatPackSchema);

export default BeatPack;
