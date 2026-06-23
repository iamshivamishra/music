import mongoose, { Schema, Model } from "mongoose";
import type { ILicense } from "@/types";

const LicenseSchema = new Schema<ILicense>(
  {
    beatId: { type: Schema.Types.ObjectId, ref: "Beat", required: true },
    type: {
      type: String,
      enum: ["basic", "premium", "unlimited"],
      required: true,
    },
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 1 },
    streamLimit: { type: Number, default: 0 },
    includesWav: { type: Boolean, default: false },
    includesStems: { type: Boolean, default: false },
    commercialUse: { type: Boolean, default: false },
    terms: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

LicenseSchema.index({ beatId: 1, type: 1 }, { unique: true });
LicenseSchema.index({ beatId: 1, isActive: 1 });

const License: Model<ILicense> =
  mongoose.models.License || mongoose.model<ILicense>("License", LicenseSchema);

export default License;
