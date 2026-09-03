import mongoose, { Schema, type Model } from "mongoose";
import type { INotificationLog } from "@/types";

const NotificationLogSchema = new Schema<INotificationLog>(
  {
    producerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    channel: { type: String, enum: ["whatsapp", "email"], required: true },
    kind: { type: String, enum: ["sale", "drop"], required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", sparse: true },
    beatId: { type: Schema.Types.ObjectId, ref: "Beat", sparse: true },
    status: {
      type: String,
      enum: ["queued", "sent", "failed", "skipped"],
      required: true,
      default: "queued",
    },
    providerMessageId: { type: String },
    error: { type: String },
  },
  { timestamps: true }
);

NotificationLogSchema.index(
  { orderId: 1, producerId: 1, kind: 1, channel: 1 },
  { unique: true, sparse: true }
);
NotificationLogSchema.index({ producerId: 1, createdAt: -1 });

const NotificationLog: Model<INotificationLog> =
  mongoose.models.NotificationLog ||
  mongoose.model<INotificationLog>("NotificationLog", NotificationLogSchema);

export default NotificationLog;
