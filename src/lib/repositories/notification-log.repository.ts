import { connectDB } from "@/lib/db";
import NotificationLog from "@/lib/models/NotificationLog";
import type { INotificationLog, NotificationChannel, NotificationKind } from "@/types";

export const notificationLogRepository = {
  async create(
    data: Pick<INotificationLog, "producerId" | "channel" | "kind" | "status"> &
      Partial<Pick<INotificationLog, "orderId" | "beatId" | "error">>
  ): Promise<INotificationLog> {
    await connectDB();
    const [log] = await NotificationLog.create([data]);
    return log.toObject() as INotificationLog;
  },

  async markSent(id: string, providerMessageId: string): Promise<void> {
    await connectDB();
    await NotificationLog.findByIdAndUpdate(id, {
      $set: { status: "sent", providerMessageId },
    });
  },

  async markFailed(id: string, error: string): Promise<void> {
    await connectDB();
    await NotificationLog.findByIdAndUpdate(id, {
      $set: { status: "failed", error },
    });
  },

  async existsForOrder(
    orderId: string,
    producerId: string,
    kind: NotificationKind,
    channel: NotificationChannel
  ): Promise<boolean> {
    await connectDB();
    const count = await NotificationLog.countDocuments({
      orderId,
      producerId,
      kind,
      channel,
      status: "sent",
    });
    return count > 0;
  },

  async countTodayByProducer(
    producerId: string,
    channel: NotificationChannel
  ): Promise<number> {
    await connectDB();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    return NotificationLog.countDocuments({
      producerId,
      channel,
      createdAt: { $gte: startOfDay },
    });
  },

  async findByOrder(orderId: string): Promise<INotificationLog[]> {
    await connectDB();
    return NotificationLog.find({ orderId })
      .sort({ createdAt: -1 })
      .lean<INotificationLog[]>();
  },
};
