import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Beat from "@/lib/models/Beat";
import type { ChartScoreWeights } from "@/lib/chart-score";
import type { IBeat, BeatStatus, BeatFilters, PaginatedResult } from "@/types";
import type { ClientSession, FilterQuery, SortOrder } from "mongoose";

type SortOption = "newest" | "popular" | "most_sold";

const SORT_MAP: Record<SortOption, Record<string, SortOrder>> = {
  newest: { createdAt: -1 },
  popular: { plays: -1 },
  most_sold: { salesCount: -1, createdAt: -1 },
};

const PUBLIC_BEAT_EXCLUSIONS = "-audioFullUrl -stemsUrl -storageKeys -privateToken";
const STUDIO_BEAT_EXCLUSIONS = "-audioFullUrl -stemsUrl -storageKeys";
const ACCESS_BEAT_EXCLUSIONS = "-audioFullUrl -stemsUrl -storageKeys";

interface RepoOptions {
  session?: ClientSession;
}

export const beatRepository = {
  async findWithFilters(
    filters: BeatFilters,
    page: number,
    limit: number,
    sort: SortOption = "newest"
  ): Promise<PaginatedResult<IBeat>> {
    await connectDB();
    const query: FilterQuery<IBeat> = {};

    if (filters.isPublished !== undefined) query.isPublished = filters.isPublished;
    else query.isPublished = true;

    if (filters.genre) query.genre = filters.genre;
    if (filters.key) query.key = filters.key;
    if (filters.mood) query.mood = filters.mood;
    if (filters.producerId) query.producerId = filters.producerId;
    if (filters.tags?.length) query.tags = { $in: filters.tags };

    if (filters.bpm) {
      const bpmQuery: { $gte?: number; $lte?: number } = {};
      if (filters.bpm.min !== undefined) bpmQuery.$gte = filters.bpm.min;
      if (filters.bpm.max !== undefined) bpmQuery.$lte = filters.bpm.max;
      if (Object.keys(bpmQuery).length > 0) query.bpm = bpmQuery;
    }

    if (filters.search) {
      query.$text = { $search: filters.search };
    }

    if (filters.producerIds?.length) {
      query.producerId = { $in: filters.producerIds };
    }

    const skip = (page - 1) * limit;
    const sortOrder = SORT_MAP[sort] || SORT_MAP.newest;

    const [data, total] = await Promise.all([
      Beat.find(query)
        .select(PUBLIC_BEAT_EXCLUSIONS)
        .sort(sortOrder)
        .skip(skip)
        .limit(limit)
        .lean<IBeat[]>(),
      Beat.countDocuments(query),
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

  async findById(
    id: string,
    includeFullAudio = false,
    options: RepoOptions = {}
  ): Promise<IBeat | null> {
    await connectDB();
    const query = Beat.findById(id);
    if (!includeFullAudio) query.select(ACCESS_BEAT_EXCLUSIONS);
    if (options.session) query.session(options.session);
    return query.lean<IBeat>();
  },

  async findByIdWithKeys(
    id: string,
    options: RepoOptions = {}
  ): Promise<IBeat | null> {
    await connectDB();
    const query = Beat.findById(id).select("-audioFullUrl -stemsUrl");
    if (options.session) query.session(options.session);
    return query.lean<IBeat>();
  },

  async findByProducerId(producerId: string, includeUnpublished = false): Promise<IBeat[]> {
    await connectDB();
    const query: FilterQuery<IBeat> = { producerId };
    if (!includeUnpublished) query.isPublished = true;
    const dbQuery = Beat.find(query).sort({ createdAt: -1 });
    if (!includeUnpublished) {
      dbQuery.select(PUBLIC_BEAT_EXCLUSIONS);
    }
    return dbQuery.lean<IBeat[]>();
  },

  async findPublishedByProducer(producerId: string, limit: number): Promise<IBeat[]> {
    await connectDB();
    return Beat.find({ producerId, isPublished: true, status: "published" })
      .select(PUBLIC_BEAT_EXCLUSIONS)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean<IBeat[]>();
  },

  async findByIds(ids: string[], includeFullAudio = false): Promise<IBeat[]> {
    await connectDB();
    if (ids.length === 0) return [];
    const query = Beat.find({ _id: { $in: ids } });
    if (!includeFullAudio) {
      query.select(PUBLIC_BEAT_EXCLUSIONS);
    }
    return query.lean<IBeat[]>();
  },

  async findIdsByTitle(query: string): Promise<string[]> {
    await connectDB();
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const docs = await Beat.find(
      { title: { $regex: escaped, $options: "i" } },
      { _id: 1 }
    ).lean<Pick<IBeat, "_id">[]>();
    return docs.map((d) => d._id.toString());
  },

  async findByProducerPaginated(
    producerId: string,
    status?: BeatStatus,
    page = 1,
    limit = 20
  ): Promise<PaginatedResult<IBeat>> {
    await connectDB();
    const query: FilterQuery<IBeat> = { producerId };
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Beat.find(query)
        .select(STUDIO_BEAT_EXCLUSIONS)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<IBeat[]>(),
      Beat.countDocuments(query),
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

  async create(data: Partial<IBeat>, options: RepoOptions = {}): Promise<IBeat> {
    await connectDB();
    const beat = await Beat.create([data], { session: options.session });
    return beat[0].toObject() as IBeat;
  },

  async update(
    id: string,
    data: Partial<IBeat>,
    options: RepoOptions & { unset?: string[] } = {}
  ): Promise<IBeat | null> {
    await connectDB();
    const update: Record<string, unknown> = {};
    const setData = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined)
    );
    if (Object.keys(setData).length > 0) {
      update.$set = setData;
    }
    if (options.unset && options.unset.length > 0) {
      update.$unset = Object.fromEntries(options.unset.map((field) => [field, 1]));
    }
    return Beat.findByIdAndUpdate(id, update, {
      new: true,
      session: options.session,
    }).lean<IBeat>();
  },

  async delete(id: string, options: RepoOptions = {}): Promise<boolean> {
    await connectDB();
    const result = await Beat.findByIdAndDelete(id, { session: options.session });
    return !!result;
  },

  async incrementPlays(id: string): Promise<void> {
    await connectDB();
    await Beat.findByIdAndUpdate(id, { $inc: { plays: 1 } });
  },

  async findProducerId(id: string): Promise<string | null> {
    await connectDB();
    const beat = await Beat.findById(id).select("producerId").lean<{ producerId?: unknown }>();
    return beat?.producerId ? String(beat.producerId) : null;
  },

  async incrementSalesCount(id: string, options: RepoOptions = {}): Promise<void> {
    await connectDB();
    await Beat.findByIdAndUpdate(id, { $inc: { salesCount: 1 } }, { session: options.session });
  },

  async incrementSharesCount(id: string): Promise<void> {
    await connectDB();
    await Beat.findByIdAndUpdate(id, { $inc: { sharesCount: 1 } });
  },

  async incrementEmbedViews(id: string): Promise<void> {
    await connectDB();
    await Beat.findByIdAndUpdate(id, { $inc: { embedViews: 1 } });
  },

  async incrementLikesCount(id: string, options: RepoOptions = {}): Promise<void> {
    await connectDB();
    await Beat.findByIdAndUpdate(id, { $inc: { likesCount: 1 } }, { session: options.session });
  },

  async decrementLikesCount(id: string, options: RepoOptions = {}): Promise<void> {
    await connectDB();
    await Beat.updateOne(
      { _id: id, likesCount: { $gt: 0 } },
      { $inc: { likesCount: -1 } },
      { session: options.session }
    );
  },

  async setLikesCount(id: string, likesCount: number, options: RepoOptions = {}): Promise<void> {
    await connectDB();
    await Beat.findByIdAndUpdate(
      id,
      { $set: { likesCount: Math.max(0, likesCount) } },
      { session: options.session }
    );
  },

  async findRecent(limit = 8): Promise<IBeat[]> {
    await connectDB();
    return Beat.aggregate<IBeat>([
      { $match: { isPublished: true } },
      {
        $addFields: {
          sortDate: { $ifNull: ["$publishedAt", "$createdAt"] },
        },
      },
      { $sort: { sortDate: -1 } },
      { $limit: limit },
      {
        $project: {
          audioFullUrl: 0,
          stemsUrl: 0,
          storageKeys: 0,
          privateToken: 0,
          sortDate: 0,
        },
      },
    ]);
  },

  async findTrending(limit = 8): Promise<IBeat[]> {
    await connectDB();
    return Beat.find({ isPublished: true })
      .select(PUBLIC_BEAT_EXCLUSIONS)
      .sort({ plays: -1 })
      .limit(limit)
      .lean<IBeat[]>();
  },

  async countByProducer(producerId: string): Promise<number> {
    await connectDB();
    return Beat.countDocuments({ producerId });
  },

  async countByProducerIds(
    producerIds: string[]
  ): Promise<Map<string, number>> {
    if (producerIds.length === 0) return new Map();
    await connectDB();
    const objectIds = producerIds.map((id) => new mongoose.Types.ObjectId(id));
    const results = await Beat.aggregate<{ _id: string; count: number }>([
      { $match: { producerId: { $in: objectIds }, status: "published" } },
      { $group: { _id: { $toString: "$producerId" }, count: { $sum: 1 } } },
    ]);
    return new Map(results.map((r) => [r._id, r.count]));
  },

  async countByProducerAndStatus(producerId: string, status: BeatStatus): Promise<number> {
    await connectDB();
    return Beat.countDocuments({ producerId, status });
  },

  async findRelated(
    beatId: string,
    genre: string,
    producerId: string,
    limit = 6
  ): Promise<IBeat[]> {
    await connectDB();
    const byGenre = await Beat.find({
      _id: { $ne: beatId },
      isPublished: true,
      $or: [{ genre }, { producerId }],
    })
      .select(PUBLIC_BEAT_EXCLUSIONS)
      .sort({ plays: -1 })
      .limit(limit)
      .lean<IBeat[]>();

    if (byGenre.length >= limit) return byGenre;

    const existingIds = [beatId, ...byGenre.map((b) => b._id.toString())];
    const filler = await Beat.find({
      _id: { $nin: existingIds },
      isPublished: true,
    })
      .select(PUBLIC_BEAT_EXCLUSIONS)
      .sort({ plays: -1 })
      .limit(limit - byGenre.length)
      .lean<IBeat[]>();

    return [...byGenre, ...filler];
  },

  async countAll(): Promise<number> {
    await connectDB();
    return Beat.countDocuments();
  },

  // --- Niche wale extra functions jo merge kiye gaye hain ---

  async findAllPaginated({ page, limit }: { page: number; limit: number }) {
    await connectDB(); // Connection ensure karne ke liye yahan bhi add kar diya hai
    return Beat.find()
      .populate("producerId", "name username")
      .select("title genre coverUrl plays status isPublished producerId createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  },

  async deleteById(beatId: string) {
    await connectDB();
    return Beat.findByIdAndDelete(beatId);
  },

  async countPublished(): Promise<number> {
    await connectDB();
    return Beat.countDocuments({ isPublished: true });
  },

  async countDistinctGenres(): Promise<number> {
    await connectDB();
    const genres = await Beat.distinct("genre", { isPublished: true });
    return genres.length;
  },

  async markExclusive(
    beatId: string,
    fields: Partial<IBeat>,
    options: RepoOptions = {}
  ): Promise<IBeat | null> {
    await connectDB();
    return Beat.findByIdAndUpdate(
      beatId,
      { $set: fields },
      { new: true, session: options.session }
    ).lean<IBeat>();
  },

  async isExclusivelySold(beatId: string): Promise<boolean> {
    await connectDB();
    const beat = await Beat.findById(beatId).select("exclusiveBuyerId").lean();
    return !!beat?.exclusiveBuyerId;
  },

  async findAllPublished(): Promise<IBeat[]> {
    await connectDB();
    return Beat.find({ isPublished: true })
      .select("-audioFullUrl -stemsUrl -storageKeys -privateToken")
      .lean<IBeat[]>();
  },

  /**
   * Aggregation pipeline that scores published beats by recent sales, plays,
   * and likes — returning only the top-N instead of loading everything into JS.
   * Ties break by newest. Zero weekly sales still ranks via lifetime plays/likes.
   */
  async getTopChartBeats(
    windowDays: number,
    limit: number,
    weights: ChartScoreWeights
  ): Promise<{ beat: IBeat; chartScore: number; salesInWindow: number }[]> {
    await connectDB();
    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

    const results = await Beat.aggregate([
      { $match: { isPublished: true } },
      {
        $lookup: {
          from: "purchases",
          localField: "_id",
          foreignField: "beatId",
          pipeline: [
            { $match: { createdAt: { $gte: since } } },
            { $count: "count" },
          ],
          as: "recentSales",
        },
      },
      {
        $addFields: {
          salesInWindow: {
            $ifNull: [{ $arrayElemAt: ["$recentSales.count", 0] }, 0],
          },
        },
      },
      {
        $addFields: {
          chartScore: {
            $add: [
              { $multiply: ["$salesInWindow", weights.sales] },
              { $multiply: [{ $ifNull: ["$plays", 0] }, weights.plays] },
              { $multiply: [{ $ifNull: ["$likesCount", 0] }, weights.likes] },
            ],
          },
        },
      },
      { $sort: { chartScore: -1 as const, createdAt: -1 as const } },
      { $limit: limit },
      {
        $project: {
          audioFullUrl: 0,
          stemsUrl: 0,
          storageKeys: 0,
          privateToken: 0,
          recentSales: 0,
        },
      },
    ]);

    return results.map((doc) => ({
      beat: doc as IBeat,
      chartScore: doc.chartScore as number,
      salesInWindow: doc.salesInWindow as number,
    }));
  },

  async findRecentDrops(days: number, limit: number): Promise<IBeat[]> {
    await connectDB();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return Beat.aggregate<IBeat>([
      {
        $match: {
          isPublished: true,
          $or: [
            { publishedAt: { $gte: since } },
            { publishedAt: { $exists: false }, createdAt: { $gte: since } },
          ],
        },
      },
      {
        $addFields: {
          sortDate: { $ifNull: ["$publishedAt", "$createdAt"] },
        },
      },
      { $sort: { sortDate: -1 } },
      { $limit: limit },
      {
        $project: {
          audioFullUrl: 0,
          stemsUrl: 0,
          storageKeys: 0,
          privateToken: 0,
          sortDate: 0,
        },
      },
    ]);
  },

  async findDueScheduled(now: Date, limit = 100): Promise<IBeat[]> {
    await connectDB();
    return Beat.find({
      status: { $in: ["scheduled", "unlisted"] },
      publishAt: { $lte: now },
    })
      .select("_id status publishAt")
      .sort({ publishAt: 1 })
      .limit(limit)
      .lean<IBeat[]>();
  },

  async countDueScheduled(now: Date): Promise<number> {
    await connectDB();
    return Beat.countDocuments({
      status: { $in: ["scheduled", "unlisted"] },
      publishAt: { $lte: now },
    });
  },

  async findPublishedForSitemap(limit = 500): Promise<{ _id: string; updatedAt: Date }[]> {
    await connectDB();
    return Beat.find({ isPublished: true })
      .select("_id updatedAt")
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean<{ _id: string; updatedAt: Date }[]>();
  },

  async markPublishedMany(ids: string[], publishedAt: Date): Promise<number> {
    await connectDB();
    if (ids.length === 0) return 0;
    const result = await Beat.updateMany(
      { _id: { $in: ids }, status: { $in: ["scheduled", "unlisted"] } },
      {
        $set: {
          status: "published",
          isPublished: true,
          publishedAt,
        },
        $unset: { privateToken: 1, publishAt: 1 },
      }
    );
    return result.modifiedCount;
  },

  async findAllWithField(
    field: string
  ): Promise<Array<{ _id: string; [key: string]: unknown }>> {
    await connectDB();
    return Beat.find()
      .select(`_id ${field}`)
      .lean<Array<{ _id: string; [key: string]: unknown }>>();
  },

  async bulkUpdateSalesCount(
    updates: Array<{ id: string; salesCount: number }>
  ): Promise<void> {
    await connectDB();
    await Beat.bulkWrite(
      updates.map((u) => ({
        updateOne: {
          filter: { _id: u.id },
          update: { $set: { salesCount: u.salesCount } },
        },
      }))
    );
  },

  async findByCollaboratorUserId(userId: string): Promise<IBeat[]> {
    await connectDB();
    return Beat.find({ "collaborators.userId": userId })
      .select("-audioFullUrl -stemsUrl -storageKeys")
      .sort({ updatedAt: -1 })
      .lean<IBeat[]>();
  },

  async countPendingInvitesForUser(userId: string): Promise<number> {
    await connectDB();
    return Beat.countDocuments({
      collaborators: {
        $elemMatch: {
          userId,
          status: "pending",
          expiresAt: { $gt: new Date() },
        },
      },
      splitsStatus: "pending",
    });
  },
};