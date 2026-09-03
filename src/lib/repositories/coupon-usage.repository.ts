import { connectDB } from "@/lib/db";
import CouponUsage from "@/lib/models/CouponUsage";
import type { ICouponUsage } from "@/types";
import type { ClientSession } from "mongoose";

interface RepoOptions {
  session?: ClientSession;
}

export const couponUsageRepository = {
  async create(
    data: Partial<ICouponUsage>,
    options: RepoOptions = {}
  ): Promise<ICouponUsage> {
    await connectDB();
    const [usage] = await CouponUsage.create([data], { session: options.session });
    return usage.toObject() as ICouponUsage;
  },

  async countByUserAndCoupon(
    userId: string,
    couponId: string,
    options: RepoOptions = {}
  ): Promise<number> {
    await connectDB();
    return CouponUsage.countDocuments({ userId, couponId }).session(
      options.session ?? null
    );
  },
};
