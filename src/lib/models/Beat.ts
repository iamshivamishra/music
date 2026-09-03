import mongoose, { Schema, Model } from "mongoose";
import type { IBeat } from "@/types";

const BeatSchema = new Schema<IBeat>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, maxlength: 1000 },
    producerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    bpm: { type: Number, min: 40, max: 300 },
    key: { type: String, trim: true },
    genre: { type: String, required: true, trim: true },
    tags: {
      type: [{ type: String, trim: true }],
      validate: [(v: unknown[]) => v.length <= 20, "{PATH} exceeds the limit of 20"],
    },
    mood: { type: String, trim: true },
    duration: { type: Number, default: 0 },
    audioTaggedUrl: { type: String, required: true },
    audioFullUrl: { type: String, required: true },
    stemsUrl: { type: String },
    coverUrl: { type: String, default: "" },
    storageKeys: {
      preview: String,
      master: String,
      stems: String,
      artwork: String,
    },
    saleMode: {
      type: String,
      enum: ["individual", "pack_only"],
      default: "individual",
    },
    status: {
      type: String,
      enum: ["draft", "scheduled", "unlisted", "published", "archived"],
      default: "draft",
    },
    plays: { type: Number, default: 0 },
    salesCount: { type: Number, default: 0 },
    likesCount: { type: Number, default: 0 },
    sharesCount: { type: Number, default: 0 },
    embedViews: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false },
    publishAt: { type: Date },
    publishedAt: { type: Date },
    privateToken: { type: String },
    exclusiveBuyerId: { type: Schema.Types.ObjectId, ref: "User" },
    exclusiveSoldAt: { type: Date },
    freeDownloadEnabled: { type: Boolean, default: false },
    collaborators: {
      type: [
        {
          userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
          sharePercent: { type: Number, required: true, min: 1, max: 99 },
          status: {
            type: String,
            enum: ["pending", "accepted", "declined"],
            default: "pending",
          },
          invitedAt: { type: Date, default: Date.now },
          respondedAt: { type: Date },
          expiresAt: { type: Date, required: true },
          _id: false,
        },
      ],
      default: [],
    },
    ownerSharePercent: { type: Number, min: 1, max: 100, default: 100 },
    splitsStatus: {
      type: String,
      enum: ["inactive", "pending", "active"],
      default: "inactive",
    },
    showCollabCredits: { type: Boolean, default: true },
  },
  { timestamps: true }
);

BeatSchema.pre("save", function (next) {
  this.isPublished = this.status === "published";
  next();
});

BeatSchema.index({ genre: 1, isPublished: 1 });
BeatSchema.index({ producerId: 1, status: 1 });
BeatSchema.index({ plays: -1 });
BeatSchema.index({ likesCount: -1 });
BeatSchema.index({ createdAt: -1 });
BeatSchema.index({ title: "text", tags: "text" });
BeatSchema.index({ exclusiveBuyerId: 1 });
BeatSchema.index({ isPublished: 1, salesCount: -1 });
BeatSchema.index({ isPublished: 1, bpm: 1 });
BeatSchema.index({ isPublished: 1, createdAt: -1 });
BeatSchema.index({ privateToken: 1 }, { unique: true, sparse: true });
BeatSchema.index({ status: 1, publishAt: 1 });
BeatSchema.index({ "collaborators.userId": 1 });

const Beat: Model<IBeat> =
  mongoose.models.Beat || mongoose.model<IBeat>("Beat", BeatSchema);

export default Beat;
