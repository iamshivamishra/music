import { connectDB } from "@/lib/db";
import ServicePayment from "@/lib/models/ServicePayment";
import { toValidObjectIdOrNull } from "@/lib/security/object-id";
import type { IServicePayment, ServicePaymentKind, ServicePaymentStatus } from "@/types";
import type { ClientSession } from "mongoose";

interface RepoOptions {
  session?: ClientSession;
}

export const servicePaymentRepository = {
  async findByJobAndKind(
    jobId: string,
    kind: ServicePaymentKind,
    options: RepoOptions = {}
  ): Promise<IServicePayment | null> {
    await connectDB();
    return ServicePayment.findOne({ jobId, kind })
      .session(options.session ?? null)
      .lean<IServicePayment>();
  },

  async findByOrderId(
    orderId: string,
    options: RepoOptions = {}
  ): Promise<IServicePayment | null> {
    await connectDB();
    return ServicePayment.findOne({ orderId })
      .session(options.session ?? null)
      .lean<IServicePayment>();
  },

  async create(
    data: Partial<IServicePayment>,
    options: RepoOptions = {}
  ): Promise<IServicePayment> {
    await connectDB();
    const [payment] = await ServicePayment.create([data], { session: options.session });
    return payment.toObject() as IServicePayment;
  },

  async updateStatus(
    id: string,
    status: ServicePaymentStatus,
    options: RepoOptions = {}
  ): Promise<IServicePayment | null> {
    await connectDB();
    return ServicePayment.findByIdAndUpdate(
      id,
      { status },
      { new: true, session: options.session }
    ).lean<IServicePayment>();
  },

  async markEligibleByJobAndKind(
    jobId: string,
    kind: ServicePaymentKind,
    options: RepoOptions = {}
  ): Promise<IServicePayment | null> {
    await connectDB();
    return ServicePayment.findOneAndUpdate(
      { jobId, kind, status: "captured" },
      { $set: { status: "eligible" } },
      { new: true, session: options.session }
    ).lean<IServicePayment>();
  },

  async markRefundedByOrderId(
    orderId: string,
    options: RepoOptions = {}
  ): Promise<IServicePayment | null> {
    await connectDB();
    return ServicePayment.findOneAndUpdate(
      { orderId, status: { $ne: "refunded" } },
      { $set: { status: "refunded" } },
      { new: true, session: options.session }
    ).lean<IServicePayment>();
  },

  async getEligibleEarningsByProducer(producerId: string): Promise<number> {
    await connectDB();
    const producerObjectId = toValidObjectIdOrNull(producerId);
    if (!producerObjectId) return 0;

    const result = await ServicePayment.aggregate([
      { $match: { producerId: producerObjectId, status: "eligible" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return result[0]?.total ?? 0;
  },
};
