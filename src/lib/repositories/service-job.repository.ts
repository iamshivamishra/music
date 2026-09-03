import { connectDB } from "@/lib/db";
import ServiceJob from "@/lib/models/ServiceJob";
import type { IServiceJob, PaginatedResult, ServiceJobStatus } from "@/types";
import type { ClientSession, FilterQuery } from "mongoose";

interface RepoOptions {
  session?: ClientSession;
}

function paginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    data,
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

export const serviceJobRepository = {
  async findById(id: string, options: RepoOptions = {}): Promise<IServiceJob | null> {
    await connectDB();
    return ServiceJob.findById(id)
      .session(options.session ?? null)
      .lean<IServiceJob>();
  },

  async findByDepositOrderId(
    orderId: string,
    options: RepoOptions = {}
  ): Promise<IServiceJob | null> {
    await connectDB();
    return ServiceJob.findOne({ depositOrderId: orderId })
      .session(options.session ?? null)
      .lean<IServiceJob>();
  },

  async findByBalanceOrderId(
    orderId: string,
    options: RepoOptions = {}
  ): Promise<IServiceJob | null> {
    await connectDB();
    return ServiceJob.findOne({ balanceOrderId: orderId })
      .session(options.session ?? null)
      .lean<IServiceJob>();
  },

  async findByOrderId(
    orderId: string,
    options: RepoOptions = {}
  ): Promise<IServiceJob | null> {
    await connectDB();
    return ServiceJob.findOne({
      $or: [{ depositOrderId: orderId }, { balanceOrderId: orderId }],
    })
      .session(options.session ?? null)
      .lean<IServiceJob>();
  },

  async countOpenByListing(
    listingId: string,
    openStatuses: ServiceJobStatus[],
    options: RepoOptions = {}
  ): Promise<number> {
    await connectDB();
    return ServiceJob.countDocuments({
      listingId,
      status: { $in: openStatuses },
    }).session(options.session ?? null);
  },

  async findByProducerPaginated(
    producerId: string,
    status?: ServiceJobStatus,
    page = 1,
    limit = 20
  ): Promise<PaginatedResult<IServiceJob>> {
    await connectDB();
    const filter: FilterQuery<IServiceJob> = { producerId };
    if (status) filter.status = status;
    const [data, total] = await Promise.all([
      ServiceJob.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<IServiceJob[]>(),
      ServiceJob.countDocuments(filter),
    ]);
    return paginatedResult(data, total, page, limit);
  },

  async findByBuyerPaginated(
    buyerId: string,
    status?: ServiceJobStatus,
    page = 1,
    limit = 20
  ): Promise<PaginatedResult<IServiceJob>> {
    await connectDB();
    const filter: FilterQuery<IServiceJob> = { buyerId };
    if (status) filter.status = status;
    const [data, total] = await Promise.all([
      ServiceJob.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<IServiceJob[]>(),
      ServiceJob.countDocuments(filter),
    ]);
    return paginatedResult(data, total, page, limit);
  },

  async findDisputedPaginated(
    page = 1,
    limit = 20
  ): Promise<PaginatedResult<IServiceJob>> {
    await connectDB();
    const filter = { status: "disputed" as const };
    const [data, total] = await Promise.all([
      ServiceJob.find(filter)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<IServiceJob[]>(),
      ServiceJob.countDocuments(filter),
    ]);
    return paginatedResult(data, total, page, limit);
  },

  async findExpiredAwaitingAcceptance(now = new Date()): Promise<IServiceJob[]> {
    await connectDB();
    return ServiceJob.find({
      status: "awaiting_acceptance",
      acceptBy: { $lte: now },
    })
      .limit(50)
      .lean<IServiceJob[]>();
  },

  async create(data: Partial<IServiceJob>, options: RepoOptions = {}): Promise<IServiceJob> {
    await connectDB();
    const [job] = await ServiceJob.create([data], { session: options.session });
    return job.toObject() as IServiceJob;
  },

  async update(
    id: string,
    data: Partial<IServiceJob>,
    options: RepoOptions = {}
  ): Promise<IServiceJob | null> {
    await connectDB();
    return ServiceJob.findByIdAndUpdate(id, data, {
      new: true,
      session: options.session,
    }).lean<IServiceJob>();
  },

  async updateIfStatus(
    id: string,
    fromStatuses: ServiceJobStatus[],
    data: Partial<IServiceJob>,
    options: RepoOptions = {}
  ): Promise<IServiceJob | null> {
    await connectDB();
    return ServiceJob.findOneAndUpdate(
      { _id: id, status: { $in: fromStatuses } },
      { $set: data },
      { new: true, session: options.session }
    ).lean<IServiceJob>();
  },
};
