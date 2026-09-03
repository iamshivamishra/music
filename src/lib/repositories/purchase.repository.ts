import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Purchase from "@/lib/models/Purchase";
import { toValidObjectIdOrNull } from "@/lib/security/object-id";
import type { IPurchase, PaginatedResult } from "@/types";
import type { ClientSession } from "mongoose";

interface RepoOptions {
  session?: ClientSession;
}

export const purchaseRepository = {
  async findByBuyerId(buyerId: string, options: RepoOptions = {}): Promise<IPurchase[]> {
    await connectDB();
    return Purchase.find({ buyerId })
      .sort({ createdAt: -1 })
      .session(options.session ?? null)
      .lean<IPurchase[]>();
  },

  async findByBeatId(beatId: string, options: RepoOptions = {}): Promise<IPurchase[]> {
    await connectDB();
    return Purchase.find({ beatId })
      .sort({ createdAt: -1 })
      .session(options.session ?? null)
      .lean<IPurchase[]>();
  },

  async hasPurchased(buyerId: string, beatId: string, options: RepoOptions = {}): Promise<boolean> {
    await connectDB();
    return (await Purchase.countDocuments({ buyerId, beatId }).session(options.session ?? null)) > 0;
  },

  async findByBuyerAndBeat(
    buyerId: string,
    beatId: string,
    options: RepoOptions = {}
  ): Promise<IPurchase[]> {
    await connectDB();
    return Purchase.find({ buyerId, beatId })
      .sort({ createdAt: -1 })
      .session(options.session ?? null)
      .lean<IPurchase[]>();
  },

  async findByBuyerAndOrderId(
    buyerId: string,
    orderId: string,
    options: RepoOptions = {}
  ): Promise<IPurchase[]> {
    await connectDB();
    return Purchase.find({ buyerId, orderId })
      .sort({ createdAt: -1 })
      .session(options.session ?? null)
      .lean<IPurchase[]>();
  },

  async create(data: Partial<IPurchase>, options: RepoOptions = {}): Promise<IPurchase> {
    await connectDB();
    const purchase = await Purchase.create([data], { session: options.session });
    return purchase[0].toObject() as IPurchase;
  },

  async getPurchasedBeatIds(buyerId: string): Promise<string[]> {
    await connectDB();
    const purchases = await Purchase.find({ buyerId })
      .select("beatId")
      .lean<Pick<IPurchase, "beatId">[]>();
    return purchases.filter((p) => p.beatId).map((p) => p.beatId!.toString());
  },

  async getPurchasedBeatIdsForBeats(buyerId: string, beatIds: string[]): Promise<string[]> {
    await connectDB();
    if (beatIds.length === 0) return [];
    const purchases = await Purchase.find({
      buyerId,
      beatId: { $in: beatIds.map((id) => new mongoose.Types.ObjectId(id)) },
    })
      .select("beatId")
      .lean<Pick<IPurchase, "beatId">[]>();
    return purchases.filter((p) => p.beatId).map((p) => p.beatId!.toString());
  },

  async getEarningsByProducer(producerId: string): Promise<number> {
    await connectDB();
    const producerObjectId = toValidObjectIdOrNull(producerId);
    if (!producerObjectId) return 0;

    const result = await Purchase.aggregate([
      { $match: { producerId: producerObjectId } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return result[0]?.total ?? 0;
  },

  async getGrossEarnings(producerId: string): Promise<number> {
    return this.getEarningsByProducer(producerId);
  },

  async getTaxRegister(
    producerId: string,
    from: Date,
    to: Date,
    limit: number
  ): Promise<{ purchases: IPurchase[]; overflow: boolean }> {
    await connectDB();
    const producerObjectId = toValidObjectIdOrNull(producerId);
    if (!producerObjectId) return { purchases: [], overflow: false };

    const docs = await Purchase.find({
      producerId: producerObjectId,
      createdAt: { $gte: from, $lt: to },
    })
      .select("buyerId guestEmail beatId packId licenseType amount orderId offerId sourceType createdAt")
      .sort({ createdAt: 1 })
      .limit(limit + 1)
      .lean<IPurchase[]>();

    const overflow = docs.length > limit;
    return { purchases: overflow ? docs.slice(0, limit) : docs, overflow };
  },

  async getTaxRegisterTotals(
    producerId: string,
    from: Date,
    to: Date
  ): Promise<{ count: number; gmv: number }> {
    await connectDB();
    const producerObjectId = toValidObjectIdOrNull(producerId);
    if (!producerObjectId) return { count: 0, gmv: 0 };

    const result = await Purchase.aggregate<{ count: number; gmv: number }>([
      {
        $match: {
          producerId: producerObjectId,
          createdAt: { $gte: from, $lt: to },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          gmv: { $sum: "$amount" },
        },
      },
    ]);

    return {
      count: result[0]?.count ?? 0,
      gmv: result[0]?.gmv ?? 0,
    };
  },

  async countByBuyer(buyerId: string): Promise<number> {
    await connectDB();
    return Purchase.countDocuments({ buyerId });
  },

  async countByBeat(beatId: string): Promise<number> {
    await connectDB();
    return Purchase.countDocuments({ beatId });
  },

  async countByLicense(licenseId: string): Promise<number> {
    await connectDB();
    return Purchase.countDocuments({ licenseId });
  },

  /**
   * Raw monthly revenue aggregation for a producer.
   * Returns only months with data; month-filling and label formatting
   * belong in the service layer.
   */
  async getMonthlyRevenueRaw(
    producerId: string,
    since: Date
  ): Promise<{ year: number; month: number; revenue: number; sales: number }[]> {
    await connectDB();

    const result = await Purchase.aggregate([
      {
        $match: {
          producerId: new mongoose.Types.ObjectId(producerId),
          createdAt: { $gte: since },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          revenue: { $sum: "$amount" },
          sales: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    return result.map((r: { _id: { year: number; month: number }; revenue: number; sales: number }) => ({
      year: r._id.year,
      month: r._id.month,
      revenue: r.revenue,
      sales: r.sales,
    }));
  },

  /**
   * Top selling beats for a producer.
   */
  async getTopBeats(
    producerId: string,
    limit = 5
  ): Promise<
    { beatId: string; title: string; revenue: number; sales: number }[]
  > {
    await connectDB();
    const result = await Purchase.aggregate([
      {
        $match: {
          producerId: new mongoose.Types.ObjectId(producerId),
          beatId: { $exists: true },
        },
      },
      {
        $lookup: {
          from: "beats",
          localField: "beatId",
          foreignField: "_id",
          as: "beat",
        },
      },
      { $unwind: "$beat" },
      {
        $group: {
          _id: "$beatId",
          title: { $first: "$beat.title" },
          revenue: { $sum: "$amount" },
          sales: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: limit },
    ]);

    return result.map(
      (r: { _id: unknown; title: string; revenue: number; sales: number }) => ({
        beatId: String(r._id ?? ""),
        title: r.title,
        revenue: r.revenue,
        sales: r.sales,
      })
    );
  },

  /**
   * Recent sales for a producer with beat details.
   */
  async getProducerSales(
    producerId: string,
    page = 1,
    limit = 20
  ): Promise<{
    data: {
      purchaseId: string;
      beatTitle: string;
      beatId: string;
      licenseType: string;
      amount: number;
      buyerName: string;
      createdAt: Date;
    }[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    await connectDB();

    const matchStage = {
      $match: { producerId: new mongoose.Types.ObjectId(producerId) },
    };

    const countResult = await Purchase.aggregate([
      matchStage,
      { $count: "total" },
    ]);
    const total = countResult[0]?.total ?? 0;

    const result = await Purchase.aggregate([
      matchStage,
      { $sort: { createdAt: -1 as const } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $lookup: {
          from: "beats",
          localField: "beatId",
          foreignField: "_id",
          as: "beat",
        },
      },
      { $unwind: { path: "$beat", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "buyerId",
          foreignField: "_id",
          as: "buyer",
        },
      },
      { $unwind: { path: "$buyer", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          purchaseId: "$_id",
          beatTitle: { $ifNull: ["$beat.title", "Pack Purchase"] },
          beatId: "$beatId",
          licenseType: 1,
          amount: 1,
          buyerName: {
            $ifNull: ["$buyer.displayName", "$buyer.name"],
          },
          createdAt: 1,
        },
      },
    ]);

    return {
      data: result,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  },

  /**
   * Total sales count for a producer.
   */
  async countByProducer(producerId: string): Promise<number> {
    await connectDB();
    return Purchase.countDocuments({
      producerId: new mongoose.Types.ObjectId(producerId),
    });
  },

  async countAll(): Promise<number> {
    await connectDB();
    return Purchase.countDocuments();
  },

  async getTotalRevenue(): Promise<number> {
    await connectDB();
    const result = await Purchase.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return result[0]?.total ?? 0;
  },

  async getPurchasedPackIdsForPacks(buyerId: string, packIds: string[]): Promise<string[]> {
    await connectDB();
    if (packIds.length === 0) return [];
    const purchases = await Purchase.find({
      buyerId,
      packId: { $in: packIds.map((id) => new mongoose.Types.ObjectId(id)) },
    })
      .select("packId")
      .lean<Pick<IPurchase, "packId">[]>();
    return purchases.filter((p) => p.packId).map((p) => p.packId!.toString());
  },

  async hasPackPurchase(buyerId: string, packId: string, options: RepoOptions = {}): Promise<boolean> {
    await connectDB();
    return (await Purchase.countDocuments({ buyerId, packId }).session(options.session ?? null)) > 0;
  },

  async findPackPurchase(
    buyerId: string,
    packId: string,
    options: RepoOptions = {}
  ): Promise<IPurchase | null> {
    await connectDB();
    return Purchase.findOne({ buyerId, packId })
      .sort({ createdAt: -1 })
      .session(options.session ?? null)
      .lean<IPurchase>();
  },

  async findPackPurchasesByBuyer(buyerId: string): Promise<IPurchase[]> {
    await connectDB();
    return Purchase.find({ buyerId, packId: { $exists: true, $ne: null } })
      .sort({ createdAt: -1 })
      .lean<IPurchase[]>();
  },

  async updatePackTier(
    buyerId: string,
    packId: string,
    newTier: string,
    newAmount: number,
    options: RepoOptions = {}
  ): Promise<IPurchase | null> {
    await connectDB();
    return Purchase.findOneAndUpdate(
      { buyerId, packId },
      { packTier: newTier, amount: newAmount },
      { new: true, session: options.session }
    ).lean<IPurchase>();
  },

  async findById(id: string, options: RepoOptions = {}): Promise<IPurchase | null> {
    await connectDB();
    return Purchase.findById(id)
      .session(options.session ?? null)
      .lean<IPurchase>();
  },

  async findAllIds(): Promise<string[]> {
    await connectDB();
    const docs = await Purchase.find().select("_id").lean<Pick<IPurchase, "_id">[]>();
    return docs.map((d) => d._id.toString());
  },

  async findIdsPaginated(skip: number, limit: number): Promise<string[]> {
    await connectDB();
    const docs = await Purchase.find({ licenseNumber: { $exists: false } })
      .select("_id")
      .sort({ _id: 1 })
      .skip(skip)
      .limit(limit)
      .hint({ _id: 1 })
      .lean<Pick<IPurchase, "_id">[]>();
    return docs.map((d) => d._id.toString());
  },

  async findAllPaginated({ page, limit }: { page: number; limit: number }) {
    await connectDB();
    return Purchase.find()
      .populate("buyerId", "name email")
      .populate("beatId", "title coverUrl")
      .select("buyerId beatId licenseType amount createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  },

  async findByBuyerIdPaginated(
    buyerId: string,
    {
      page,
      limit,
      type,
      beatIds,
    }: { page: number; limit: number; type?: "beat" | "pack"; beatIds?: string[] }
  ): Promise<PaginatedResult<IPurchase>> {
    await connectDB();
    const filter: Record<string, unknown> = { buyerId };
    if (beatIds) {
      filter.beatId = { $in: beatIds };
    } else if (type === "beat") {
      filter.beatId = { $exists: true, $ne: null };
    } else if (type === "pack") {
      filter.packId = { $exists: true, $ne: null };
    }
    const [data, total] = await Promise.all([
      Purchase.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<IPurchase[]>(),
      Purchase.countDocuments(filter),
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

  async getBuyerAggregation(buyerId: string): Promise<{
    totalSpend: number;
    beatCount: number;
    packCount: number;
    tierMixArr: { _id: string; count: number }[];
    recentPurchases: IPurchase[];
  }> {
    await connectDB();
    const oid = new mongoose.Types.ObjectId(buyerId);

    const [agg, recentPurchases] = await Promise.all([
      Purchase.aggregate([
        { $match: { buyerId: oid } },
        {
          $facet: {
            totals: [
              {
                $group: {
                  _id: null,
                  totalSpend: { $sum: "$amount" },
                  beatCount: {
                    $sum: { $cond: [{ $ifNull: ["$beatId", false] }, 1, 0] },
                  },
                  packCount: {
                    $sum: { $cond: [{ $ifNull: ["$packId", false] }, 1, 0] },
                  },
                },
              },
            ],
            tierMix: [
              { $match: { licenseType: { $exists: true } } },
              { $group: { _id: "$licenseType", count: { $sum: 1 } } },
            ],
          },
        },
      ]),
      Purchase.find({ buyerId })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean<IPurchase[]>(),
    ]);

    const totals = agg[0]?.totals[0] ?? { totalSpend: 0, beatCount: 0, packCount: 0 };
    const tierMixArr: { _id: string; count: number }[] = agg[0]?.tierMix ?? [];

    return {
      totalSpend: totals.totalSpend,
      beatCount: totals.beatCount,
      packCount: totals.packCount,
      tierMixArr,
      recentPurchases,
    };
  },

  async findByIdAndBuyer(purchaseId: string, buyerId: string): Promise<IPurchase | null> {
    await connectDB();
    return Purchase.findOne({ _id: purchaseId, buyerId }).lean<IPurchase>();
  },

  async updateLicenseFields(
    purchaseId: string,
    fields: { licenseNumber?: string; licensePdfKey?: string; verificationHash?: string },
    options: RepoOptions = {}
  ): Promise<IPurchase | null> {
    await connectDB();
    return Purchase.findByIdAndUpdate(purchaseId, { $set: fields }, {
      new: true,
      session: options.session,
    }).lean<IPurchase>();
  },

  async findByLicenseNumber(licenseNumber: string): Promise<IPurchase | null> {
    await connectDB();
    return Purchase.findOne({ licenseNumber }).lean<IPurchase>();
  },

  async findByVerificationHash(hash: string): Promise<IPurchase | null> {
    await connectDB();
    return Purchase.findOne({ verificationHash: hash }).lean<IPurchase>();
  },

  async findByGuestEmail(guestEmail: string): Promise<IPurchase[]> {
    await connectDB();
    return Purchase.find({ guestEmail })
      .sort({ createdAt: -1 })
      .lean<IPurchase[]>();
  },

  async findPaidByGuestEmailAndBeat(
    guestEmail: string,
    beatId: string
  ): Promise<IPurchase | null> {
    await connectDB();
    return Purchase.findOne({ guestEmail, beatId }).lean<IPurchase>();
  },

  async linkGuestPurchases(guestEmail: string, buyerId: string, options: RepoOptions = {}): Promise<number> {
    await connectDB();
    const result = await Purchase.updateMany(
      { guestEmail, buyerId: { $exists: false } },
      { $set: { buyerId }, $unset: { guestEmail: 1 } },
      { session: options.session }
    );
    return result.modifiedCount;
  },

  async findByOrderId(orderId: string): Promise<IPurchase[]> {
    await connectDB();
    return Purchase.find({ orderId })
      .sort({ createdAt: -1 })
      .lean<IPurchase[]>();
  },

  async aggregateCountsByField(
    field: string
  ): Promise<Map<string, number>> {
    await connectDB();
    const results = await Purchase.aggregate<{ _id: string; count: number }>([
      { $match: { [field]: { $exists: true } } },
      { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    ]);
    return new Map(results.map((r) => [r._id.toString(), r.count]));
  },
};
