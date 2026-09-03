import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Earning from "@/lib/models/Earning";
import { toValidObjectIdOrNull } from "@/lib/security/object-id";
import type { IEarning } from "@/types";
import type { ClientSession } from "mongoose";

interface RepoOptions {
  session?: ClientSession;
}

export interface EarningInsert {
  purchaseId: string;
  orderId: string;
  beatId?: string;
  packId?: string;
  producerId: string;
  grossAmount: number;
  sharePercent: number;
}

export interface EarningSaleRecord {
  purchaseId: string;
  beatTitle: string | null;
  beatId: string;
  licenseType: string;
  amount: number;
  shareAmount: number;
  sharePercent: number;
  ownerProducerId: string;
  buyerName: string | null;
  createdAt: Date;
}

export interface MonthlyRevenueRaw {
  year: number;
  month: number;
  revenue: number;
  sales: number;
}

function isDuplicateKeyError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const mongoError = error as { code?: number; writeErrors?: { code?: number }[] };
  if (mongoError.code === 11000) return true;
  return (
    Array.isArray(mongoError.writeErrors) &&
    mongoError.writeErrors.every((writeError) => writeError.code === 11000)
  );
}

export const earningRepository = {
  async insertShares(rows: EarningInsert[], options: RepoOptions = {}): Promise<void> {
    if (rows.length === 0) return;
    await connectDB();
    const docs = rows.map((row) => ({
      purchaseId: row.purchaseId,
      orderId: row.orderId,
      beatId: row.beatId,
      packId: row.packId,
      producerId: row.producerId,
      grossAmount: row.grossAmount,
      sharePercent: row.sharePercent,
    }));

    try {
      await Earning.insertMany(docs, {
        session: options.session,
        ordered: false,
      });
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
    }
  },

  async sumGrossByProducer(producerId: string): Promise<number> {
    await connectDB();
    const producerObjectId = toValidObjectIdOrNull(producerId);
    if (!producerObjectId) return 0;

    const result = await Earning.aggregate([
      { $match: { producerId: producerObjectId } },
      { $group: { _id: null, total: { $sum: "$grossAmount" } } },
    ]);
    return result[0]?.total ?? 0;
  },

  async countByProducer(producerId: string): Promise<number> {
    await connectDB();
    return Earning.countDocuments({
      producerId: new mongoose.Types.ObjectId(producerId),
    });
  },

  async getMonthlyRevenueRaw(
    producerId: string,
    months = 12
  ): Promise<MonthlyRevenueRaw[]> {
    await connectDB();
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const result = await Earning.aggregate<{
      _id: { year: number; month: number };
      revenue: number;
      sales: number;
    }>([
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
          revenue: { $sum: "$grossAmount" },
          sales: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    return result.map((row) => ({
      year: row._id.year,
      month: row._id.month,
      revenue: row.revenue,
      sales: row.sales,
    }));
  },

  async getTopBeats(
    producerId: string,
    limit = 5
  ): Promise<{ beatId: string; title: string; revenue: number; sales: number }[]> {
    await connectDB();
    const result = await Earning.aggregate([
      {
        $match: {
          producerId: new mongoose.Types.ObjectId(producerId),
          beatId: { $exists: true, $ne: null },
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
          revenue: { $sum: "$grossAmount" },
          sales: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: limit },
    ]);

    return result.map(
      (row: { _id: unknown; title: string; revenue: number; sales: number }) => ({
        beatId: row._id?.toString() ?? "",
        title: row.title,
        revenue: row.revenue,
        sales: row.sales,
      })
    );
  },

  async getProducerSales(
    producerId: string,
    page = 1,
    limit = 20
  ): Promise<{
    data: EarningSaleRecord[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    await connectDB();
    const producerObjectId = new mongoose.Types.ObjectId(producerId);
    const matchStage = { $match: { producerId: producerObjectId } };

    const countResult = await Earning.aggregate([matchStage, { $count: "total" }]);
    const total = countResult[0]?.total ?? 0;

    const result = await Earning.aggregate([
      matchStage,
      { $sort: { createdAt: -1 as const } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $lookup: {
          from: "purchases",
          localField: "purchaseId",
          foreignField: "_id",
          as: "purchase",
        },
      },
      { $unwind: { path: "$purchase", preserveNullAndEmptyArrays: true } },
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
          localField: "purchase.buyerId",
          foreignField: "_id",
          as: "buyer",
        },
      },
      { $unwind: { path: "$buyer", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          purchaseId: "$purchaseId",
          beatTitle: "$beat.title",
          beatId: "$beatId",
          licenseType: "$purchase.licenseType",
          amount: "$purchase.amount",
          shareAmount: "$grossAmount",
          sharePercent: "$sharePercent",
          ownerProducerId: "$purchase.producerId",
          buyerName: {
            $ifNull: ["$buyer.displayName", "$buyer.name"],
          },
          createdAt: 1,
        },
      },
    ]);

    return {
      data: result.map((row) => ({
        purchaseId: row.purchaseId?.toString() ?? row._id?.toString() ?? "",
        beatTitle: row.beatTitle ?? null,
        beatId: row.beatId?.toString() ?? "",
        licenseType: row.licenseType ?? "",
        amount: row.amount ?? row.shareAmount,
        shareAmount: row.shareAmount,
        sharePercent: row.sharePercent,
        ownerProducerId: row.ownerProducerId?.toString() ?? "",
        buyerName: row.buyerName ?? null,
        createdAt: row.createdAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  },

  async findByPurchaseIds(purchaseIds: string[]): Promise<IEarning[]> {
    await connectDB();
    if (purchaseIds.length === 0) return [];
    return Earning.find({
      purchaseId: { $in: purchaseIds.map((id) => new mongoose.Types.ObjectId(id)) },
    }).lean<IEarning[]>();
  },

  async countByProducerInRange(
    producerId: string,
    from: Date,
    to: Date
  ): Promise<number> {
    await connectDB();
    const producerObjectId = toValidObjectIdOrNull(producerId);
    if (!producerObjectId) return 0;
    return Earning.countDocuments({
      producerId: producerObjectId,
      createdAt: { $gte: from, $lte: to },
    });
  },

  async getPaidBySource(
    producerId: string,
    from: Date,
    to: Date
  ): Promise<{ source: string; paid: number; earnings: number }[]> {
    await connectDB();
    const producerObjectId = toValidObjectIdOrNull(producerId);
    if (!producerObjectId) return [];

    const result = await Earning.aggregate<{
      _id: string | null;
      paid: number;
      earnings: number;
    }>([
      {
        $match: {
          producerId: producerObjectId,
          createdAt: { $gte: from, $lte: to },
        },
      },
      {
        $lookup: {
          from: "orders",
          localField: "orderId",
          foreignField: "_id",
          as: "order",
        },
      },
      {
        $group: {
          _id: {
            $ifNull: [{ $arrayElemAt: ["$order.attribution.source", 0] }, "direct"],
          },
          paid: { $sum: 1 },
          earnings: { $sum: "$grossAmount" },
        },
      },
    ]);

    return result.map((row) => ({
      source: row._id || "direct",
      paid: row.paid,
      earnings: row.earnings,
    }));
  },

  async getPaidByBeat(
    producerId: string,
    from: Date,
    to: Date
  ): Promise<{ beatId: string; paid: number; earnings: number }[]> {
    await connectDB();
    const producerObjectId = toValidObjectIdOrNull(producerId);
    if (!producerObjectId) return [];

    const result = await Earning.aggregate<{
      _id: mongoose.Types.ObjectId;
      paid: number;
      earnings: number;
    }>([
      {
        $match: {
          producerId: producerObjectId,
          beatId: { $exists: true, $ne: null },
          createdAt: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: "$beatId",
          paid: { $sum: 1 },
          earnings: { $sum: "$grossAmount" },
        },
      },
    ]);

    return result.map((row) => ({
      beatId: row._id.toString(),
      paid: row.paid,
      earnings: row.earnings,
    }));
  },
};
