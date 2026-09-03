import mongoose, { Schema, type Model } from "mongoose";
import type { IServiceListing } from "@/types";

const ServiceExtraSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    price: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const ServiceListingSchema = new Schema<IServiceListing>(
  {
    producerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["custom_beat", "mixing", "mastering", "other"],
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, maxlength: 2000 },
    startingPrice: { type: Number, required: true, min: 1 },
    depositPercent: {
      type: Number,
      enum: [20, 50, 100],
      required: true,
    },
    turnaroundDays: { type: Number, required: true, min: 1, max: 90 },
    extras: {
      type: [ServiceExtraSchema],
      default: [],
      validate: [(v: unknown[]) => v.length <= 5, "Maximum 5 extras"],
    },
    status: {
      type: String,
      enum: ["draft", "published", "paused"],
      required: true,
      default: "draft",
    },
  },
  { timestamps: true }
);

ServiceListingSchema.index({ producerId: 1, status: 1 });
ServiceListingSchema.index({ producerId: 1, createdAt: -1 });

const ServiceListing: Model<IServiceListing> =
  mongoose.models.ServiceListing ||
  mongoose.model<IServiceListing>("ServiceListing", ServiceListingSchema);

export default ServiceListing;
