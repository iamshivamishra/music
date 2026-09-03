import mongoose, { Schema, type Model } from "mongoose";
import type { IServicePayment } from "@/types";

const ServicePaymentSchema = new Schema<IServicePayment>(
  {
    jobId: { type: Schema.Types.ObjectId, ref: "ServiceJob", required: true },
    producerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    buyerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    kind: {
      type: String,
      enum: ["deposit", "balance"],
      required: true,
    },
    amount: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ["captured", "eligible", "refunded"],
      required: true,
      default: "captured",
    },
  },
  { timestamps: true }
);

ServicePaymentSchema.index({ jobId: 1, kind: 1 }, { unique: true });
ServicePaymentSchema.index({ producerId: 1, status: 1 });
ServicePaymentSchema.index({ orderId: 1 });

const ServicePayment: Model<IServicePayment> =
  mongoose.models.ServicePayment ||
  mongoose.model<IServicePayment>("ServicePayment", ServicePaymentSchema);

export default ServicePayment;
