import mongoose, { Schema, Model } from "mongoose";
import type { IUser } from "@/types";

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    image: { type: String },
    password: { type: String, select: false },
    role: { type: String, enum: ["buyer", "producer", "admin"], default: "buyer" },
    username: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    displayName: { type: String, trim: true, maxlength: 60 },
    bio: { type: String, trim: true, maxlength: 500 },
    avatarUrl: { type: String },
    coverImageUrl: { type: String },
    genres: {
      type: [{ type: String, trim: true }],
      validate: [(v: unknown[]) => v.length <= 20, "{PATH} exceeds the limit of 20"],
    },
    socialLinks: {
      instagram: String,
      youtube: String,
      twitter: String,
      website: String,
      spotify: String,
      soundcloud: String,
      whatsappNumber: String,
    },
    notificationPrefs: {
      saleWhatsApp: { type: Boolean, default: false },
      dropWhatsApp: { type: Boolean, default: false },
      saleEmail: { type: Boolean, default: true },
    },
    resetTokenHash: { type: String, select: false },
    resetTokenExpiry: { type: Date, select: false },
    verified: { type: Boolean, default: false },
    producerTier: { type: String, enum: ["founding", "standard"] },
    producerTierExpiresAt: { type: Date },
    platformFeeOverride: { type: Number },
    followersCount: { type: Number, default: 0 },
    salesCount: { type: Number, default: 0 },
    payoutDetails: {
      upiId: { type: String },
      bankAccount: {
        accountNumber: { type: String },
        ifsc: { type: String },
        accountName: { type: String },
      },
      razorpayContactId: { type: String },
      razorpayFundAccountId: { type: String },
    },
    taxProfile: {
      type: {
        gstin: { type: String, uppercase: true, trim: true },
        pan: { type: String, uppercase: true, trim: true },
        legalName: { type: String, trim: true, maxlength: 100 },
        stateCode: { type: String, trim: true },
        isComposition: { type: Boolean },
      },
      select: false,
      _id: false,
    },
    store: {
      headline: { type: String, trim: true, maxlength: 80 },
      showWhatsApp: { type: Boolean, default: true },
      pinnedBeatIds: [{ type: Schema.Types.ObjectId, ref: "Beat" }],
      featuredPackId: { type: Schema.Types.ObjectId, ref: "BeatPack" },
    },
  },
  { timestamps: true }
);

UserSchema.index({ role: 1 });
UserSchema.index({ role: 1, producerTier: 1 });
UserSchema.index({ role: 1, salesCount: -1 });
UserSchema.index({ producerTier: 1, producerTierExpiresAt: 1 });
UserSchema.index({ resetTokenHash: 1, resetTokenExpiry: 1 }, { sparse: true });

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
