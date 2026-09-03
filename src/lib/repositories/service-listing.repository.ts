import { connectDB } from "@/lib/db";
import ServiceListing from "@/lib/models/ServiceListing";
import type { IServiceListing, PaginatedResult, ServiceListingStatus } from "@/types";
import type { ClientSession } from "mongoose";

interface RepoOptions {
  session?: ClientSession;
}

export const serviceListingRepository = {
  async findById(id: string, options: RepoOptions = {}): Promise<IServiceListing | null> {
    await connectDB();
    return ServiceListing.findById(id)
      .session(options.session ?? null)
      .lean<IServiceListing>();
  },

  async findByProducerPaginated(
    producerId: string,
    status?: ServiceListingStatus,
    page = 1,
    limit = 20
  ): Promise<PaginatedResult<IServiceListing>> {
    await connectDB();
    const filter: Record<string, unknown> = { producerId };
    if (status) filter.status = status;

    const [data, total] = await Promise.all([
      ServiceListing.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<IServiceListing[]>(),
      ServiceListing.countDocuments(filter),
    ]);

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
  },

  async findPublishedByProducer(producerId: string): Promise<IServiceListing[]> {
    await connectDB();
    return ServiceListing.find({ producerId, status: "published" })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean<IServiceListing[]>();
  },

  async countByProducer(producerId: string): Promise<number> {
    await connectDB();
    return ServiceListing.countDocuments({ producerId });
  },

  async create(
    data: Partial<IServiceListing>,
    options: RepoOptions = {}
  ): Promise<IServiceListing> {
    await connectDB();
    const [listing] = await ServiceListing.create([data], { session: options.session });
    return listing.toObject() as IServiceListing;
  },

  async update(
    id: string,
    data: Partial<IServiceListing>,
    options: RepoOptions = {}
  ): Promise<IServiceListing | null> {
    await connectDB();
    return ServiceListing.findByIdAndUpdate(id, data, {
      new: true,
      session: options.session,
    }).lean<IServiceListing>();
  },

  async delete(id: string, options: RepoOptions = {}): Promise<boolean> {
    await connectDB();
    const result = await ServiceListing.deleteOne({ _id: id }).session(
      options.session ?? null
    );
    return result.deletedCount > 0;
  },
};
