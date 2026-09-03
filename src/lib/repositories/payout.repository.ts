import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Payout from "@/lib/models/Payout";
import type { IPayout, PaginatedResult, PayoutStatus } from "@/types";
import type { ClientSession } from "mongoose";

interface RepoOptions {
  session?: ClientSession;
}

export const payoutRepository = {
  async create(data: Partial<IPayout>, options: RepoOptions = {}): Promise<IPayout> {
    await connectDB();
    const [payout] = await Payout.create([data], { session: options.session });
    return payout.toObject() as IPayout;
  },

  async findById(id: string, options: RepoOptions = {}): Promise<IPayout | null> {
    await connectDB();
    return Payout.findById(id)
      .session(options.session ?? null)
      .lean<IPayout>();
  },

  async updateStatus(
    id: string,
    status: PayoutStatus,
    extra: Partial<IPayout> = {},
    options: RepoOptions = {}
  ): Promise<IPayout | null> {
    await connectDB();
    return Payout.findByIdAndUpdate(
      id,
      { $set: { status, ...extra } },
      { new: true, session: options.session }
    ).lean<IPayout>();
  },

  async hasInFlightPayout(producerId: string): Promise<boolean> {
    await connectDB();
    return (
      (await Payout.countDocuments({
        producerId: new mongoose.Types.ObjectId(producerId),
        status: { $in: ["requested", "processing"] },
      })) > 0
    );
  },

  async getCompletedAndProcessingTotal(producerId: string): Promise<number> {
    await connectDB();
    const result = await Payout.aggregate([
      {
        $match: {
          producerId: new mongoose.Types.ObjectId(producerId),
          status: { $in: ["completed", "processing"] },
        },
      },
      { $group: { _id: null, total: { $sum: "$netAmount" } } },
    ]);
    return result[0]?.total ?? 0;
  },

  async findByProducer(
    producerId: string,
    page = 1,
    limit = 20
  ): Promise<PaginatedResult<IPayout>> {
    await connectDB();
    const filter = { producerId: new mongoose.Types.ObjectId(producerId) };
    const [data, total] = await Promise.all([
      Payout.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<IPayout[]>(),
      Payout.countDocuments(filter),
    ]);
    const totalPages = Math.ceil(total / limit);
    return {
      data,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  },

  async findPending(page = 1, limit = 20): Promise<PaginatedResult<IPayout>> {
    await connectDB();
    const filter = { status: "requested" as const };
    const [data, total] = await Promise.all([
      Payout.find(filter)
        .populate("producerId", "name email username")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<IPayout[]>(),
      Payout.countDocuments(filter),
    ]);
    const totalPages = Math.ceil(total / limit);
    return {
      data,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  },

  async countPending(): Promise<number> {
    await connectDB();
    return Payout.countDocuments({ status: "requested" });
  },

  async findByRazorpayPayoutId(razorpayPayoutId: string): Promise<IPayout | null> {
    await connectDB();
    return Payout.findOne({ razorpayPayoutId }).lean<IPayout>();
  },

  async findCompletedInRange(producerId: string, from: Date, to: Date): Promise<IPayout[]> {
    await connectDB();
    return Payout.find({
      producerId: new mongoose.Types.ObjectId(producerId),
      status: "completed",
      processedAt: { $gte: from, $lt: to },
    })
      .sort({ processedAt: 1 })
      .lean<IPayout[]>();
  },
};
