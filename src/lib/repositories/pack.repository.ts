import { connectDB } from "@/lib/db";
import BeatPack from "@/lib/models/BeatPack";
import type { IBeatPack, PackStatus, PaginatedResult } from "@/types";
import type { ClientSession, FilterQuery, SortOrder } from "mongoose";

type SortOption = "newest" | "popular" | "most_sold";

const SORT_MAP: Record<SortOption, Record<string, SortOrder>> = {
  newest: { createdAt: -1 },
  popular: { salesCount: -1, createdAt: -1 },
  most_sold: { salesCount: -1, createdAt: -1 },
};

interface RepoOptions {
  session?: ClientSession;
}

export const packRepository = {
  async findWithFilters(
    filters: {
      genre?: string;
      search?: string;
      producerId?: string;
      isPublished?: boolean;
      status?: PackStatus;
    },
    page: number,
    limit: number,
    sort: SortOption = "newest"
  ): Promise<PaginatedResult<IBeatPack>> {
    await connectDB();
    const query: FilterQuery<IBeatPack> = {};

    if (filters.isPublished !== undefined) query.isPublished = filters.isPublished;
    else query.isPublished = true;

    if (filters.genre) query.genre = filters.genre;
    if (filters.producerId) query.producerId = filters.producerId;
    if (filters.status) query.status = filters.status;
    if (filters.search) query.$text = { $search: filters.search };

    const skip = (page - 1) * limit;
    const sortOrder = SORT_MAP[sort] || SORT_MAP.newest;

    const [data, total] = await Promise.all([
      BeatPack.find(query)
        .sort(sortOrder)
        .skip(skip)
        .limit(limit)
        .lean<IBeatPack[]>(),
      BeatPack.countDocuments(query),
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

  async findBySlug(slug: string): Promise<IBeatPack | null> {
    await connectDB();
    return BeatPack.findOne({ slug }).lean<IBeatPack>();
  },

  async findById(id: string, options: RepoOptions = {}): Promise<IBeatPack | null> {
    await connectDB();
    const q = BeatPack.findById(id);
    if (options.session) q.session(options.session);
    return q.lean<IBeatPack>();
  },

  async findByIds(ids: string[]): Promise<IBeatPack[]> {
    await connectDB();
    if (ids.length === 0) return [];
    return BeatPack.find({ _id: { $in: ids } }).lean<IBeatPack[]>();
  },

  async findByProducerPaginated(
    producerId: string,
    status?: PackStatus,
    page = 1,
    limit = 20
  ): Promise<PaginatedResult<IBeatPack>> {
    await connectDB();
    const query: FilterQuery<IBeatPack> = { producerId };
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      BeatPack.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<IBeatPack[]>(),
      BeatPack.countDocuments(query),
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

  async create(data: Partial<IBeatPack>, options: RepoOptions = {}): Promise<IBeatPack> {
    await connectDB();
    const pack = await BeatPack.create([data], { session: options.session });
    return pack[0].toObject() as IBeatPack;
  },

  async update(id: string, data: Partial<IBeatPack>): Promise<IBeatPack | null> {
    await connectDB();
    return BeatPack.findByIdAndUpdate(id, data, { new: true }).lean<IBeatPack>();
  },

  async delete(id: string, options: RepoOptions = {}): Promise<boolean> {
    await connectDB();
    const result = await BeatPack.findByIdAndDelete(id, { session: options.session });
    return !!result;
  },

  async incrementSalesCount(id: string, options: RepoOptions = {}): Promise<void> {
    await connectDB();
    await BeatPack.findByIdAndUpdate(id, { $inc: { salesCount: 1 } }, { session: options.session });
  },

  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    await connectDB();
    const query: FilterQuery<IBeatPack> = { slug };
    if (excludeId) query._id = { $ne: excludeId };
    return (await BeatPack.countDocuments(query)) > 0;
  },

  async countByProducer(producerId: string): Promise<number> {
    await connectDB();
    return BeatPack.countDocuments({ producerId });
  },

  async countAll(): Promise<number> {
    await connectDB();
    return BeatPack.countDocuments();
  },

  async findPacksByBeatIds(
    beatIds: string[]
  ): Promise<Map<string, { packId: string; packTitle: string; packSlug: string }>> {
    await connectDB();
    if (beatIds.length === 0) return new Map();

    const packs = await BeatPack.find(
      { "beats.beatId": { $in: beatIds } },
    ).select("title slug beats.beatId").lean<Array<{ _id: unknown; title: string; slug: string; beats: Array<{ beatId: unknown }> }>>();

    const map = new Map<string, { packId: string; packTitle: string; packSlug: string }>();
    for (const pack of packs) {
      for (const entry of pack.beats) {
        const bid = String(entry.beatId);
        if (beatIds.includes(bid) && !map.has(bid)) {
          map.set(bid, {
            packId: pack._id!.toString(),
            packTitle: pack.title,
            packSlug: pack.slug,
          });
        }
      }
    }
    return map;
  },

  async findPublishedPackContainingBeat(
    beatId: string
  ): Promise<{ title: string } | null> {
    await connectDB();
    const pack = await BeatPack.findOne({
      "beats.beatId": beatId,
      isPublished: true,
      status: "published",
    })
      .select("title")
      .lean<{ title: string }>();
    return pack ? { title: pack.title } : null;
  },

  async findAllWithField(
    field: string
  ): Promise<Array<{ _id: string; [key: string]: unknown }>> {
    await connectDB();
    return BeatPack.find()
      .select(`_id ${field}`)
      .lean<Array<{ _id: string; [key: string]: unknown }>>();
  },

  async bulkUpdateSalesCount(
    updates: Array<{ id: string; salesCount: number }>
  ): Promise<void> {
    await connectDB();
    await BeatPack.bulkWrite(
      updates.map((u) => ({
        updateOne: {
          filter: { _id: u.id },
          update: { $set: { salesCount: u.salesCount } },
        },
      }))
    );
  },
};
