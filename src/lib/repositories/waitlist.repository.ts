import { connectDB } from "@/lib/db";
import Waitlist from "@/lib/models/Waitlist";
import type { IWaitlist, WaitlistStatus, PaginatedResult } from "@/types";
import type { JoinWaitlistInput } from "@/lib/validators/waitlist";

export const waitlistRepository = {
  async findByEmail(email: string): Promise<IWaitlist | null> {
    await connectDB();
    return Waitlist.findOne({ email: email.toLowerCase() }).lean<IWaitlist>();
  },

  async findById(id: string): Promise<IWaitlist | null> {
    await connectDB();
    return Waitlist.findById(id).lean<IWaitlist>();
  },

  async create(data: JoinWaitlistInput): Promise<IWaitlist> {
    await connectDB();
    const entry = await Waitlist.create(data);
    return entry.toObject() as IWaitlist;
  },

  async findPending(
    page: number,
    limit: number
  ): Promise<PaginatedResult<IWaitlist>> {
    await connectDB();
    const query = { status: "pending" as const };
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Waitlist.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<IWaitlist[]>(),
      Waitlist.countDocuments(query),
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

  async findAll(
    page: number,
    limit: number
  ): Promise<PaginatedResult<IWaitlist>> {
    await connectDB();
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Waitlist.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<IWaitlist[]>(),
      Waitlist.countDocuments(),
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

  async markInvited(id: string): Promise<IWaitlist | null> {
    await connectDB();
    return Waitlist.findByIdAndUpdate(
      id,
      { status: "invited", invitedAt: new Date() },
      { new: true }
    ).lean<IWaitlist>();
  },

  async markJoined(email: string): Promise<IWaitlist | null> {
    await connectDB();
    return Waitlist.findOneAndUpdate(
      { email: email.toLowerCase() },
      { status: "joined", joinedAt: new Date() },
      { new: true }
    ).lean<IWaitlist>();
  },

  async countByStatus(status: WaitlistStatus): Promise<number> {
    await connectDB();
    return Waitlist.countDocuments({ status });
  },
};
