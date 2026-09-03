import mongoose, { Schema, type Model } from "mongoose";
import type { IInvitation } from "@/types";

const InvitationSchema = new Schema<IInvitation>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, trim: true },
    token: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["sent", "accepted", "expired"],
      default: "sent",
    },
    producerTier: { type: String, enum: ["founding", "standard"], default: "founding" },
    platformFeeOverride: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    acceptedAt: { type: Date },
    followUp3SentAt: { type: Date },
    followUp7SentAt: { type: Date },
  },
  { timestamps: true }
);

InvitationSchema.index({ token: 1 }, { unique: true });
InvitationSchema.index({ email: 1 });
InvitationSchema.index({ status: 1 });
InvitationSchema.index({ status: 1, expiresAt: 1 });
InvitationSchema.index({ status: 1, acceptedAt: 1 });

const Invitation: Model<IInvitation> =
  mongoose.models.Invitation || mongoose.model<IInvitation>("Invitation", InvitationSchema);

export default Invitation;
