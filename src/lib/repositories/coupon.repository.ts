import { connectDB } from "@/lib/db";
import Coupon from "@/lib/models/Coupon";
import type { ICoupon, CouponStatus, PaginatedResult } from "@/types";
import type { ClientSession } from "mongoose";

interface RepoOptions {
  session?: ClientSession;
}

export const couponRepository = {
  async findByProducerPaginated(
    producerId: string,
    status?: CouponStatus,
    page = 1,
    limit = 20
  ): Promise<PaginatedResult<ICoupon>> {
    await connectDB();
    const filter: Record<string, unknown> = { producerId };
    if (status) filter.status = status;

    const [data, total] = await Promise.all([
      Coupon.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<ICoupon[]>(),
      Coupon.countDocuments(filter),
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

  async findByCode(code: string): Promise<ICoupon | null> {
    await connectDB();
    return Coupon.findOne({ code: code.toUpperCase() }).lean<ICoupon>();
  },

  async findById(id: string, options: RepoOptions = {}): Promise<ICoupon | null> {
    await connectDB();
    return Coupon.findById(id).session(options.session ?? null).lean<ICoupon>();
  },

  async create(
    data: Partial<ICoupon>,
    options: RepoOptions = {}
  ): Promise<ICoupon> {
    await connectDB();
    const [coupon] = await Coupon.create([data], { session: options.session });
    return coupon.toObject() as ICoupon;
  },

  async update(id: string, data: Partial<ICoupon>): Promise<ICoupon | null> {
    await connectDB();
    return Coupon.findByIdAndUpdate(id, data, { new: true }).lean<ICoupon>();
  },

  async delete(id: string): Promise<boolean> {
    await connectDB();
    const result = await Coupon.deleteOne({ _id: id });
    return result.deletedCount > 0;
  },

  async incrementUsage(
    id: string,
    options: RepoOptions = {}
  ): Promise<void> {
    await connectDB();
    await Coupon.updateOne(
      { _id: id },
      { $inc: { usageCount: 1 } },
      { session: options.session }
    );
  },

  async incrementUsageIfAllowed(
    id: string,
    usageLimit: number | undefined,
    options: RepoOptions = {}
  ): Promise<boolean> {
    await connectDB();
    const filter: Record<string, unknown> = {
      _id: id,
      status: "active",
    };
    if (usageLimit && usageLimit > 0) {
      filter.usageCount = { $lt: usageLimit };
    }
    const result = await Coupon.findOneAndUpdate(
      filter,
      { $inc: { usageCount: 1 } },
      { new: true, session: options.session }
    ).lean<ICoupon>();
    return result !== null;
  },

  async countByProducer(producerId: string): Promise<number> {
    await connectDB();
    return Coupon.countDocuments({ producerId });
  },
};
