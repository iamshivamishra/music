import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Purchase from "@/lib/models/Purchase";
import { toValidObjectIdOrNull } from "@/lib/security/object-id";
import type {
  ProducerCustomerGroup,
  ProducerCustomerPurchase,
} from "@/lib/crm/types";
import type { IPurchase } from "@/types";

export type ProducerCustomerIdentity = {
  buyerId?: string;
  guestEmail?: string;
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function identityOr(
  identity: ProducerCustomerIdentity
): mongoose.FilterQuery<IPurchase>[] {
  const or: mongoose.FilterQuery<IPurchase>[] = [];
  if (identity.buyerId) {
    const buyerOid = toValidObjectIdOrNull(identity.buyerId);
    if (buyerOid) or.push({ buyerId: buyerOid });
  }
  if (identity.guestEmail) {
    or.push({
      $expr: {
        $eq: [
          { $toLower: { $ifNull: ["$guestEmail", ""] } },
          identity.guestEmail.toLowerCase(),
        ],
      },
    });
  }
  return or;
}

export const producerCustomerRepository = {
  /**
   * One row per paying buyer for a producer.
   * Groups by buyerId when present, else a User matched on guest email, else the guest email.
   */
  async getCustomersByProducer(
    producerId: string,
    {
      page = 1,
      limit = 20,
      q,
    }: { page?: number; limit?: number; q?: string } = {}
  ): Promise<{
    data: ProducerCustomerGroup[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    await connectDB();
    const producerOid = toValidObjectIdOrNull(producerId);
    if (!producerOid) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const search = q?.trim();

    const pipeline: mongoose.PipelineStage[] = [
      { $match: { producerId: producerOid } },
      {
        $addFields: {
          guestEmailLower: {
            $cond: {
              if: {
                $and: [
                  { $ne: ["$guestEmail", null] },
                  { $ne: ["$guestEmail", ""] },
                ],
              },
              then: { $toLower: "$guestEmail" },
              else: null,
            },
          },
          effectiveTier: { $ifNull: ["$licenseType", "$packTier"] },
        },
      },
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
        $lookup: {
          from: "users",
          let: { emailLower: "$guestEmailLower" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $ne: ["$$emailLower", null] },
                    { $eq: ["$email", "$$emailLower"] },
                  ],
                },
              },
            },
            {
              $project: {
                _id: 1,
                name: 1,
                displayName: 1,
                email: 1,
                avatarUrl: 1,
                image: 1,
              },
            },
          ],
          as: "userByEmail",
        },
      },
      {
        $unwind: { path: "$userByEmail", preserveNullAndEmptyArrays: true },
      },
      {
        $addFields: {
          canonicalBuyerId: { $ifNull: ["$buyerId", "$userByEmail._id"] },
          searchName: {
            $ifNull: [
              "$buyer.displayName",
              {
                $ifNull: [
                  "$buyer.name",
                  {
                    $ifNull: ["$userByEmail.displayName", "$userByEmail.name"],
                  },
                ],
              },
            ],
          },
          searchEmail: {
            $ifNull: [
              "$buyer.email",
              { $ifNull: ["$guestEmailLower", "$userByEmail.email"] },
            ],
          },
          resolvedAvatar: {
            $ifNull: [
              "$buyer.avatarUrl",
              {
                $ifNull: [
                  "$buyer.image",
                  { $ifNull: ["$userByEmail.avatarUrl", "$userByEmail.image"] },
                ],
              },
            ],
          },
          resolvedUserEmail: {
            $ifNull: ["$buyer.email", "$userByEmail.email"],
          },
        },
      },
    ];

    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { searchName: { $regex: escapeRegex(search), $options: "i" } },
            { searchEmail: { $regex: escapeRegex(search), $options: "i" } },
          ],
        },
      });
    }

    pipeline.push(
      {
        $group: {
          _id: {
            $cond: {
              if: { $ne: ["$canonicalBuyerId", null] },
              then: {
                $concat: ["u:", { $toString: "$canonicalBuyerId" }],
              },
              else: {
                $concat: ["e:", { $ifNull: ["$guestEmailLower", "unknown"] }],
              },
            },
          },
          buyerId: { $first: "$canonicalBuyerId" },
          guestEmail: { $first: "$guestEmailLower" },
          userEmail: { $first: "$resolvedUserEmail" },
          name: { $first: "$searchName" },
          avatarUrl: { $first: "$resolvedAvatar" },
          orderCount: { $sum: 1 },
          spend: { $sum: "$amount" },
          lastPurchaseAt: { $max: "$createdAt" },
          licenseTypes: { $push: "$effectiveTier" },
        },
      },
      { $sort: { lastPurchaseAt: -1 } },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $skip: (safePage - 1) * safeLimit }, { $limit: safeLimit }],
        },
      }
    );

    const [facet] = await Purchase.aggregate<{
      metadata: { total: number }[];
      data: {
        buyerId?: mongoose.Types.ObjectId | null;
        guestEmail?: string | null;
        userEmail?: string | null;
        name?: string | null;
        avatarUrl?: string | null;
        orderCount: number;
        spend: number;
        lastPurchaseAt: Date;
        licenseTypes: Array<string | null>;
      }[];
    }>(pipeline);

    const total = facet?.metadata[0]?.total ?? 0;
    const data: ProducerCustomerGroup[] = (facet?.data ?? []).map((row) => ({
      buyerId: row.buyerId ? row.buyerId.toString() : null,
      guestEmail: row.guestEmail ?? null,
      userEmail: row.userEmail ?? null,
      name: row.name ?? null,
      avatarUrl: row.avatarUrl ?? null,
      orderCount: row.orderCount,
      spend: row.spend,
      lastPurchaseAt: row.lastPurchaseAt,
      licenseTypes: (row.licenseTypes ?? []).filter(
        (tier): tier is string => typeof tier === "string" && tier.length > 0
      ),
    }));

    return {
      data,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  },

  async findDistinctGuestEmailsByProducer(producerId: string): Promise<string[]> {
    await connectDB();
    const producerOid = toValidObjectIdOrNull(producerId);
    if (!producerOid) return [];
    const emails = await Purchase.distinct("guestEmail", {
      producerId: producerOid,
      guestEmail: { $exists: true, $nin: [null, ""] },
      buyerId: { $exists: false },
    });
    return emails.filter((email): email is string => typeof email === "string");
  },

  async existsForIdentity(
    producerId: string,
    identity: ProducerCustomerIdentity
  ): Promise<boolean> {
    await connectDB();
    const producerOid = toValidObjectIdOrNull(producerId);
    if (!producerOid) return false;
    const or = identityOr(identity);
    if (or.length === 0) return false;
    const found = await Purchase.findOne({ producerId: producerOid, $or: or })
      .select("_id")
      .lean();
    return Boolean(found);
  },

  async findPurchasesForIdentity(
    producerId: string,
    identity: ProducerCustomerIdentity
  ): Promise<ProducerCustomerPurchase[]> {
    await connectDB();
    const producerOid = toValidObjectIdOrNull(producerId);
    if (!producerOid) return [];

    const or = identityOr(identity);
    if (or.length === 0) return [];

    const rows = await Purchase.aggregate<{
      _id: mongoose.Types.ObjectId;
      title: string;
      kind: "beat" | "pack";
      licenseType: string | null;
      amount: number;
      purchasedAt: Date;
    }>([
      { $match: { producerId: producerOid, $or: or } },
      { $sort: { createdAt: -1 as const } },
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
          from: "beatpacks",
          localField: "packId",
          foreignField: "_id",
          as: "pack",
        },
      },
      { $unwind: { path: "$pack", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          title: {
            $ifNull: ["$beat.title", { $ifNull: ["$pack.title", "Unknown"] }],
          },
          kind: {
            $cond: {
              if: { $ifNull: ["$packId", false] },
              then: "pack",
              else: "beat",
            },
          },
          licenseType: { $ifNull: ["$licenseType", "$packTier"] },
          amount: 1,
          purchasedAt: "$createdAt",
        },
      },
    ]);

    return rows.map((row) => ({
      purchaseId: row._id.toString(),
      title: row.title,
      kind: row.kind,
      licenseType: row.licenseType ?? null,
      amount: row.amount,
      purchasedAt: row.purchasedAt,
    }));
  },
};
