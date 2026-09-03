import mongoose, { Schema, type Model } from "mongoose";
import type { ILead } from "@/types";

const LeadSchema = new Schema<ILead>(
  {
    producerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    beatId: { type: Schema.Types.ObjectId, ref: "Beat", required: true },
    email: { type: String, lowercase: true, trim: true },
    whatsappNumber: { type: String, trim: true },
    source: {
      type: String,
      enum: ["free_download"],
      required: true,
      default: "free_download",
    },
    consentAt: { type: Date, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

LeadSchema.index({ beatId: 1, email: 1 }, { unique: true, sparse: true });
LeadSchema.index(
  { beatId: 1, whatsappNumber: 1 },
  { unique: true, sparse: true }
);
LeadSchema.index({ producerId: 1, createdAt: -1 });
LeadSchema.index({ beatId: 1, createdAt: -1 });

const Lead: Model<ILead> =
  mongoose.models.Lead || mongoose.model<ILead>("Lead", LeadSchema);

export default Lead;
