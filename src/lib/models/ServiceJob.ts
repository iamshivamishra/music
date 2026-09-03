import mongoose, { Schema, type Model } from "mongoose";
import type { IServiceJob } from "@/types";

const ServiceBriefSchema = new Schema(
  {
    notes: { type: String, required: true, maxlength: 5000 },
    referencesUrl: { type: String, maxlength: 500 },
    bpm: { type: Number, min: 40, max: 300 },
    genre: { type: String, maxlength: 60 },
    duePreference: { type: String, maxlength: 200 },
  },
  { _id: false }
);

const ServiceExtraSnapshotSchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 80 },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const ServiceJobSchema = new Schema<IServiceJob>(
  {
    listingId: { type: Schema.Types.ObjectId, ref: "ServiceListing", required: true },
    producerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    buyerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: [
        "pending_deposit",
        "awaiting_acceptance",
        "in_progress",
        "delivered",
        "revision_requested",
        "completed",
        "cancelled",
        "disputed",
      ],
      required: true,
      default: "pending_deposit",
    },
    brief: { type: ServiceBriefSchema, required: true },
    extras: { type: [ServiceExtraSnapshotSchema], default: [] },
    listingTitle: { type: String, required: true },
    listingType: {
      type: String,
      enum: ["custom_beat", "mixing", "mastering", "other"],
      required: true,
    },
    quotedTotal: { type: Number, required: true, min: 1 },
    depositAmount: { type: Number, required: true, min: 1 },
    balanceAmount: { type: Number, required: true, min: 0 },
    depositOrderId: { type: Schema.Types.ObjectId, ref: "Order" },
    balanceOrderId: { type: Schema.Types.ObjectId, ref: "Order" },
    deliveryKey: { type: String },
    revisionCount: { type: Number, default: 0, min: 0, max: 2 },
    acceptBy: { type: Date },
  },
  { timestamps: true }
);

ServiceJobSchema.index({ producerId: 1, status: 1, createdAt: -1 });
ServiceJobSchema.index({ buyerId: 1, createdAt: -1 });
ServiceJobSchema.index({ listingId: 1 });
ServiceJobSchema.index({ acceptBy: 1, status: 1 });
ServiceJobSchema.index({ depositOrderId: 1 }, { sparse: true });
ServiceJobSchema.index({ balanceOrderId: 1 }, { sparse: true });

const ServiceJob: Model<IServiceJob> =
  mongoose.models.ServiceJob || mongoose.model<IServiceJob>("ServiceJob", ServiceJobSchema);

export default ServiceJob;
