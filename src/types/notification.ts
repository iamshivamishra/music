import type { Types } from "mongoose";

export type NotificationChannel = "whatsapp" | "email";
export type NotificationKind = "sale" | "drop";
export type NotificationStatus = "queued" | "sent" | "failed" | "skipped";

export interface INotificationLog {
  _id: string | Types.ObjectId;
  producerId: string | Types.ObjectId;
  channel: NotificationChannel;
  kind: NotificationKind;
  orderId?: string | Types.ObjectId;
  beatId?: string | Types.ObjectId;
  status: NotificationStatus;
  providerMessageId?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}
